import { useEffect, useRef } from 'react'
import { BackgroundId, readAccentRgb } from '../lib/backgrounds'

interface Props {
  mode: BackgroundId
}

/**
 * Full-screen canvas that renders one of several ambient animations.
 * The animation tints itself with the active theme accent and pauses when the
 * window is hidden or the user prefers reduced motion.
 */
export default function AnimatedBackground({ mode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (mode === 'none' || mode === 'custom') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0
    let raf = 0
    let running = true

    const accent = readAccentRgb()
    const ac = (a: number) => `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, ${a})`

    const themeObserver = new MutationObserver(() => {
      const next = readAccentRgb()
      accent[0] = next[0]
      accent[1] = next[1]
      accent[2] = next[2]
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    const pointer = { x: -9999, y: -9999, active: false }

    // --- per-mode state -----------------------------------------------------
    type Dot = { x: number; y: number; vx: number; vy: number; r: number; tw: number }
    type Star = { x: number; y: number; z: number }
    let dots: Dot[] = []
    let stars: Star[] = []

    const rand = (min: number, max: number) => min + Math.random() * (max - min)

    const init = () => {
      const area = w * h
      if (mode === 'constellation') {
        const count = Math.min(140, Math.round(area / 13000))
        dots = Array.from({ length: count }, () => ({
          x: rand(0, w),
          y: rand(0, h),
          vx: rand(-0.22, 0.22),
          vy: rand(-0.22, 0.22),
          r: rand(1, 2.4),
          tw: 0,
        }))
      } else if (mode === 'particles') {
        const count = Math.min(90, Math.round(area / 22000))
        dots = Array.from({ length: count }, () => ({
          x: rand(0, w),
          y: rand(0, h),
          vx: rand(-0.12, 0.12),
          vy: rand(-0.3, -0.05),
          r: rand(1.5, 5),
          tw: rand(0, Math.PI * 2),
        }))
      } else if (mode === 'starfield') {
        const count = Math.min(360, Math.round(area / 5200))
        stars = Array.from({ length: count }, () => ({
          x: rand(-w / 2, w / 2),
          y: rand(-h / 2, h / 2),
          z: rand(1, w),
        }))
      }
    }

    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      init()
    }

    // --- renderers ----------------------------------------------------------
    const drawConstellation = () => {
      ctx.clearRect(0, 0, w, h)
      const linkDist = 130
      for (const d of dots) {
        d.x += d.vx
        d.y += d.vy
        if (pointer.active) {
          const dx = d.x - pointer.x
          const dy = d.y - pointer.y
          const dist2 = dx * dx + dy * dy
          if (dist2 < 18000 && dist2 > 1) {
            const f = 0.6 / dist2
            d.vx += dx * f
            d.vy += dy * f
          }
        }
        d.vx *= 0.99
        d.vy *= 0.99
        if (d.x < 0 || d.x > w) d.vx *= -1
        if (d.y < 0 || d.y > h) d.vy *= -1
        d.x = Math.max(0, Math.min(w, d.x))
        d.y = Math.max(0, Math.min(h, d.y))
      }
      ctx.lineWidth = 1
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i]
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < linkDist) {
            ctx.strokeStyle = ac((1 - dist / linkDist) * 0.32)
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      for (const d of dots) {
        ctx.fillStyle = ac(0.85)
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const drawParticles = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const d of dots) {
        d.x += d.vx
        d.y += d.vy
        d.tw += 0.02
        if (d.y < -10) {
          d.y = h + 10
          d.x = rand(0, w)
        }
        if (d.x < -10) d.x = w + 10
        if (d.x > w + 10) d.x = -10
        const glow = 0.35 + 0.25 * Math.sin(d.tw + t * 0.001)
        const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 4)
        grad.addColorStop(0, ac(glow))
        grad.addColorStop(1, ac(0))
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r * 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const drawStarfield = () => {
      ctx.clearRect(0, 0, w, h)
      const cx = w / 2
      const cy = h / 2
      const speed = 6
      for (const s of stars) {
        const pz = s.z
        s.z -= speed
        if (s.z <= 1) {
          s.x = rand(-w / 2, w / 2)
          s.y = rand(-h / 2, h / 2)
          s.z = w
          continue
        }
        const k = 128 / s.z
        const px = cx + s.x * k
        const py = cy + s.y * k
        if (px < 0 || px > w || py < 0 || py > h) continue
        const pk = 128 / pz
        const ppx = cx + s.x * pk
        const ppy = cy + s.y * pk
        const size = (1 - s.z / w) * 2.2
        const alpha = Math.min(1, (1 - s.z / w) * 1.3)
        ctx.strokeStyle = ac(alpha * 0.85)
        ctx.lineWidth = size
        ctx.beginPath()
        ctx.moveTo(ppx, ppy)
        ctx.lineTo(px, py)
        ctx.stroke()
      }
    }

    const drawWaves = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      const layers = 4
      for (let l = 0; l < layers; l++) {
        const phase = t * 0.0004 * (1 + l * 0.35)
        const amp = h * (0.06 + l * 0.03)
        const baseY = h * (0.35 + l * 0.16)
        const grad = ctx.createLinearGradient(0, baseY - amp, 0, baseY + amp)
        grad.addColorStop(0, ac(0))
        grad.addColorStop(0.5, ac(0.16 - l * 0.025))
        grad.addColorStop(1, ac(0))
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.moveTo(0, h)
        for (let x = 0; x <= w; x += 12) {
          const y =
            baseY +
            Math.sin(x * 0.006 + phase) * amp +
            Math.sin(x * 0.013 + phase * 1.7) * amp * 0.4
          ctx.lineTo(x, y)
        }
        ctx.lineTo(w, h)
        ctx.closePath()
        ctx.fill()
      }
    }

    const frame = (t: number) => {
      if (!running) return
      switch (mode) {
        case 'constellation':
          drawConstellation()
          break
        case 'particles':
          drawParticles(t)
          break
        case 'starfield':
          drawStarfield()
          break
        case 'waves':
          drawWaves(t)
          break
      }
      raf = requestAnimationFrame(frame)
    }

    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.active = true
    }
    const onPointerLeave = () => {
      pointer.active = false
      pointer.x = -9999
      pointer.y = -9999
    }
    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!reduceMotion) {
        running = true
        raf = requestAnimationFrame(frame)
      }
    }

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    if (mode === 'constellation') {
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerleave', onPointerLeave)
    }

    if (reduceMotion) {
      // Render a single static frame instead of animating.
      frame(0)
      running = false
      cancelAnimationFrame(raf)
    } else {
      raf = requestAnimationFrame(frame)
    }

    return () => {
      running = false
      cancelAnimationFrame(raf)
      themeObserver.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [mode])

  if (mode === 'none' || mode === 'custom') return null
  return <canvas ref={canvasRef} className="bg-canvas" aria-hidden="true" />
}
