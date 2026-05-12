(() => {
  if (window.__mouseWebhidSnifferInstalled) return
  window.__mouseWebhidSnifferInstalled = true

  const state = {
    logs: [],
    capture: true,
    nextId: 1,
    attachedDevices: new WeakSet(),
    lastAction: null,
    nextActionId: 1,
  }

  const now = () => new Date().toISOString()

  const toBytes = value => {
    if (value == null) return []
    if (value instanceof DataView) {
      return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
    }
    if (ArrayBuffer.isView(value)) {
      return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
    }
    if (value instanceof ArrayBuffer) {
      return Array.from(new Uint8Array(value))
    }
    return []
  }

  const hex = bytes => bytes.map(byte => byte.toString(16).padStart(2, '0')).join(' ')

  const describeReports = reports => (reports || []).map(report => ({
    reportId: report.reportId,
    itemCount: report.items?.length ?? 0,
  }))

  const describeCollections = collections => (collections || []).map(collection => ({
    usagePage: collection.usagePage,
    usage: collection.usage,
    inputReports: describeReports(collection.inputReports),
    outputReports: describeReports(collection.outputReports),
    featureReports: describeReports(collection.featureReports),
    children: describeCollections(collection.children),
  }))

  const describeDevice = device => ({
    productName: device?.productName || '',
    vendorId: device?.vendorId ?? null,
    productId: device?.productId ?? null,
    opened: Boolean(device?.opened),
    collections: describeCollections(device?.collections),
  })

  const cleanText = value => String(value || '').replace(/\s+/g, ' ').trim()

  const isSnifferElement = target => Boolean(target?.closest?.('#mouse-webhid-sniffer'))

  const visibleText = element => {
    if (!element) return ''
    const clone = element.cloneNode(true)
    clone.querySelectorAll('script, style, svg').forEach(node => node.remove())
    return cleanText(clone.textContent).slice(0, 180)
  }

  const nearestUsefulElement = target => {
    if (!(target instanceof Element)) return null
    return target.closest(
      'button, [role="button"], [role="radio"], [role="tab"], [role="option"], label, input, select, textarea, [class*="radio"], [class*="select"], [class*="slider"]',
    ) || target
  }

  const labelFor = element => {
    if (!element) return ''

    const id = element.getAttribute?.('id')
    if (id) {
      const label = document.querySelector(`label[for="${CSS.escape(id)}"]`)
      if (label) return visibleText(label)
    }

    const wrappingLabel = element.closest?.('label')
    if (wrappingLabel) return visibleText(wrappingLabel)

    return ''
  }

  const cssPath = element => {
    const parts = []
    let node = element
    while (node && node.nodeType === Node.ELEMENT_NODE && parts.length < 6) {
      const tag = node.tagName.toLowerCase()
      const id = node.id ? `#${node.id}` : ''
      const classes = Array.from(node.classList || [])
        .slice(0, 3)
        .map(name => `.${name}`)
        .join('')
      parts.unshift(`${tag}${id}${classes}`)
      node = node.parentElement
    }
    return parts.join(' > ')
  }

  const describeActionTarget = target => {
    const element = nearestUsefulElement(target)
    if (!element) return null

    const input = element.matches?.('input, select, textarea')
      ? element
      : element.querySelector?.('input, select, textarea')

    const nearby = element.closest?.('[role="dialog"], [class*="card"], [class*="item"], [class*="setting"], [class*="panel"], li, section, form, div')

    return {
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute('role') || '',
      type: input?.getAttribute?.('type') || '',
      text: visibleText(element),
      label: labelFor(input || element),
      ariaLabel: cleanText(element.getAttribute('aria-label') || input?.getAttribute?.('aria-label')),
      title: cleanText(element.getAttribute('title') || input?.getAttribute?.('title')),
      value: input ? cleanText(input.value) : cleanText(element.getAttribute('value')),
      checked: input && 'checked' in input ? Boolean(input.checked) : null,
      nearbyText: nearby && nearby !== element ? visibleText(nearby).slice(0, 240) : '',
      path: cssPath(element),
    }
  }

  const actionSummary = action => {
    if (!action) return ''
    const target = action.target || {}
    const name = target.label || target.text || target.ariaLabel || target.title || target.nearbyText || target.path
    const value = target.value ? ` value=${target.value}` : ''
    const checked = target.checked == null ? '' : ` checked=${target.checked}`
    return `${action.event}: ${cleanText(name).slice(0, 80)}${value}${checked}`
  }

  const recentAction = () => {
    if (!state.lastAction) return null
    return performance.now() - state.lastAction.ms <= 3000 ? state.lastAction : null
  }

  const logAction = (eventName, target) => {
    if (!state.capture || isSnifferElement(target)) return

    const action = {
      id: state.nextActionId++,
      ts: now(),
      ms: Math.round(performance.now()),
      event: eventName,
      target: describeActionTarget(target),
    }
    state.lastAction = action
    log({
      direction: 'ui',
      method: eventName,
      reportId: null,
      bytes: [],
      hex: '',
      action,
    })
  }

  const log = entry => {
    if (!state.capture) return

    const linkedAction = entry.action || (
      entry.direction !== 'ui' && entry.direction !== 'meta' ? recentAction() : null
    )

    const full = {
      id: state.nextId++,
      ts: now(),
      ms: Math.round(performance.now()),
      action: linkedAction,
      actionSummary: actionSummary(linkedAction),
      ...entry,
    }
    state.logs.push(full)
    renderRows()
    console.debug('[Mouse WebHID]', full)
  }

  const attachInputLogger = device => {
    if (!device || state.attachedDevices.has(device)) return
    state.attachedDevices.add(device)
    device.addEventListener('inputreport', event => {
      const bytes = toBytes(event.data)
      log({
        direction: 'in',
        method: 'inputreport',
        reportId: event.reportId,
        bytes,
        hex: hex(bytes),
        device: describeDevice(event.device || device),
      })
    })
  }

  const attachMany = devices => {
    for (const device of devices || []) attachInputLogger(device)
    return devices
  }

  const installActionCapture = () => {
    document.addEventListener('click', event => logAction('click', event.target), true)
    document.addEventListener('change', event => logAction('change', event.target), true)
    document.addEventListener('input', event => {
      const target = event.target
      if (target?.matches?.('input[type="range"], input[type="number"], input[type="text"], select, textarea')) {
        logAction('input', target)
      }
    }, true)
  }

  const patchWebHid = () => {
    if (!('hid' in navigator) || !window.HIDDevice) {
      setTimeout(patchWebHid, 100)
      return
    }

    const proto = window.HIDDevice.prototype

    if (!proto.__mouseSnifferSendReport && proto.sendReport) {
      proto.__mouseSnifferSendReport = proto.sendReport
      proto.sendReport = function patchedSendReport(reportId, data) {
        attachInputLogger(this)
        const bytes = toBytes(data)
        log({
          direction: 'out',
          method: 'sendReport',
          reportId,
          bytes,
          hex: hex(bytes),
          device: describeDevice(this),
        })
        return proto.__mouseSnifferSendReport.call(this, reportId, data)
      }
    }

    if (!proto.__mouseSnifferSendFeatureReport && proto.sendFeatureReport) {
      proto.__mouseSnifferSendFeatureReport = proto.sendFeatureReport
      proto.sendFeatureReport = function patchedSendFeatureReport(reportId, data) {
        attachInputLogger(this)
        const bytes = toBytes(data)
        log({
          direction: 'out',
          method: 'sendFeatureReport',
          reportId,
          bytes,
          hex: hex(bytes),
          device: describeDevice(this),
        })
        return proto.__mouseSnifferSendFeatureReport.call(this, reportId, data)
      }
    }

    if (!proto.__mouseSnifferReceiveFeatureReport && proto.receiveFeatureReport) {
      proto.__mouseSnifferReceiveFeatureReport = proto.receiveFeatureReport
      proto.receiveFeatureReport = async function patchedReceiveFeatureReport(reportId) {
        attachInputLogger(this)
        const result = await proto.__mouseSnifferReceiveFeatureReport.call(this, reportId)
        const bytes = toBytes(result)
        log({
          direction: 'in',
          method: 'receiveFeatureReport',
          reportId,
          bytes,
          hex: hex(bytes),
          device: describeDevice(this),
        })
        return result
      }
    }

    if (!proto.__mouseSnifferOpen && proto.open) {
      proto.__mouseSnifferOpen = proto.open
      proto.open = async function patchedOpen(...args) {
        const result = await proto.__mouseSnifferOpen.apply(this, args)
        attachInputLogger(this)
        log({
          direction: 'meta',
          method: 'open',
          reportId: null,
          bytes: [],
          hex: '',
          device: describeDevice(this),
        })
        return result
      }
    }

    if (!navigator.hid.__mouseSnifferRequestDevice && navigator.hid.requestDevice) {
      navigator.hid.__mouseSnifferRequestDevice = navigator.hid.requestDevice.bind(navigator.hid)
      navigator.hid.requestDevice = async (...args) => {
        const devices = await navigator.hid.__mouseSnifferRequestDevice(...args)
        attachMany(devices)
        log({
          direction: 'meta',
          method: 'requestDevice',
          reportId: null,
          bytes: [],
          hex: '',
          requestOptions: args[0] || null,
          devices: devices.map(describeDevice),
        })
        return devices
      }
    }

    if (!navigator.hid.__mouseSnifferGetDevices && navigator.hid.getDevices) {
      navigator.hid.__mouseSnifferGetDevices = navigator.hid.getDevices.bind(navigator.hid)
      navigator.hid.getDevices = async (...args) => {
        const devices = await navigator.hid.__mouseSnifferGetDevices(...args)
        attachMany(devices)
        return devices
      }
      navigator.hid.getDevices().then(attachMany).catch(() => {})
    }
  }

  const makeButton = (label, onClick) => {
    const button = document.createElement('button')
    button.textContent = label
    button.addEventListener('click', onClick)
    Object.assign(button.style, {
      border: '1px solid #4b5563',
      background: '#111827',
      color: '#f9fafb',
      borderRadius: '8px',
      padding: '6px 9px',
      cursor: 'pointer',
      fontSize: '12px',
    })
    return button
  }

  let rowsEl = null
  let counterEl = null
  let captureButton = null
  let rootEl = null
  let positionIndex = 0

  const positions = [
    { right: '16px', bottom: '16px', left: '', top: '' },
    { right: '16px', top: '16px', left: '', bottom: '' },
    { left: '16px', bottom: '16px', right: '', top: '' },
    { left: '16px', top: '16px', right: '', bottom: '' },
  ]

  const applyOverlayPosition = () => {
    if (!rootEl) return
    const position = positions[positionIndex]
    rootEl.style.left = position.left
    rootEl.style.right = position.right
    rootEl.style.top = position.top
    rootEl.style.bottom = position.bottom
  }

  const download = (name, type, text) => {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const exportJson = () => {
    download(
      `mouse-webhid-capture-${Date.now()}.json`,
      'application/json',
      JSON.stringify(state.logs, null, 2),
    )
  }

  const compactDevice = device => {
    if (!device) return ''
    const vid = device.vendorId == null ? '????' : device.vendorId.toString(16).padStart(4, '0')
    const pid = device.productId == null ? '????' : device.productId.toString(16).padStart(4, '0')
    return `${device.productName || 'Unknown'} vid=0x${vid} pid=0x${pid}`
  }

  const compactDevices = entry => {
    if (entry.device) return compactDevice(entry.device)
    if (entry.devices?.length) return entry.devices.map(compactDevice).join(' | ')
    return ''
  }

  const copyHex = async () => {
    const lines = state.logs
      .filter(entry => entry.hex)
      .map(entry => `${entry.id}\t${entry.direction}\t${entry.method}\treport ${entry.reportId}\t${entry.hex}\t${compactDevices(entry)}\t${entry.actionSummary || ''}`)
      .join('\n')
    await navigator.clipboard.writeText(lines)
  }

  const copyAll = async () => {
    await navigator.clipboard.writeText(JSON.stringify(state.logs, null, 2))
  }

  const clearLogs = () => {
    state.logs = []
    state.nextId = 1
    renderRows()
  }

  const toggleCapture = () => {
    state.capture = !state.capture
    captureButton.textContent = state.capture ? 'Pause' : 'Resume'
  }

  const moveOverlay = () => {
    positionIndex = (positionIndex + 1) % positions.length
    applyOverlayPosition()
  }

  const renderRows = () => {
    if (!rowsEl || !counterEl) return
    counterEl.textContent = String(state.logs.length)

    const rows = state.logs.slice(-80).reverse()
    rowsEl.textContent = ''
    for (const entry of rows) {
      const row = document.createElement('div')
      const suffix = entry.actionSummary ? `  <= ${entry.actionSummary}` : ''
      row.textContent = `${entry.id} ${entry.direction.padEnd(4)} ${String(entry.method).padEnd(20)} r=${entry.reportId ?? '-'} ${entry.hex}${suffix}`
      Object.assign(row.style, {
        borderTop: '1px solid rgba(75,85,99,.55)',
        padding: '4px 0',
        whiteSpace: 'pre',
      })
      rowsEl.appendChild(row)
    }
  }

  const installOverlay = () => {
    if (document.getElementById('mouse-webhid-sniffer')) return

    const root = document.createElement('div')
    root.id = 'mouse-webhid-sniffer'
    rootEl = root
    Object.assign(root.style, {
      position: 'fixed',
      zIndex: '2147483647',
      width: '720px',
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: '42vh',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      background: 'rgba(3, 7, 18, .94)',
      color: '#f9fafb',
      border: '1px solid #374151',
      borderRadius: '14px',
      boxShadow: '0 24px 70px rgba(0,0,0,.45)',
      padding: '12px',
      fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      fontSize: '12px',
    })

    const header = document.createElement('div')
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px',
    })

    const title = document.createElement('strong')
    title.innerHTML = 'Mouse WebHID Sniffer <span style="color:#9ca3af;font-weight:400">frames: </span>'
    counterEl = document.createElement('span')
    counterEl.textContent = '0'
    title.appendChild(counterEl)

    const actions = document.createElement('div')
    Object.assign(actions.style, { display: 'flex', gap: '6px', flexWrap: 'wrap' })
    captureButton = makeButton('Pause', toggleCapture)
    actions.append(
      captureButton,
      makeButton('Move', moveOverlay),
      makeButton('Copy hex', copyHex),
      makeButton('Copy all', copyAll),
      makeButton('Export JSON', exportJson),
      makeButton('Clear', clearLogs),
      makeButton('Hide', () => { root.style.display = 'none' }),
    )

    header.append(title, actions)

    rowsEl = document.createElement('div')
    Object.assign(rowsEl.style, {
      overflow: 'auto',
      minHeight: '72px',
      lineHeight: '1.35',
      color: '#d1d5db',
    })

    root.append(header, rowsEl)
    applyOverlayPosition()
    document.documentElement.appendChild(root)
  }

  patchWebHid()
  installActionCapture()
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installOverlay, { once: true })
  } else {
    installOverlay()
  }
})()
