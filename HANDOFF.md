```markdown
# IPI FLY PRO – Custom Driver Handoff Document

## 1. Goal

Build a modern, fast Tauri desktop application (Windows-first) that replaces the
official Chinese-language web driver at https://qbz.ipigame.cn for the
**IPI FLY PRO wireless gaming mouse**. UI must be available in **German and
English**, dark mode by default, with a layout inspired by Razer Synapse /
Logitech G Hub.

The original tool is a slow, awkward web app loaded from China. We want a snappy
native app with a clean UI.

## 2. Target Hardware

- USB VID: `0x3554`
- USB PID: `0xF517`
- Reports itself as `FLY PRO`
- Multiple HID collections; the relevant one for configuration is:
  - **Usage Page `0xFF02`, Usage `0x0002`**
  - Input/Output Report ID **`8`**, both 64 bits (8 bytes payload prefix) wide;
    in practice we always send/receive **16-byte frames** on this interface.

Other collections (mouse HID, consumer, keyboard) are not used by the driver UI.

## 3. HID Protocol – Reverse-Engineered Spec

All packets on Report ID 8 are **16 bytes**, sent without the report id prefix
in the data buffer (hidapi prepends it automatically).

### 3.1 Frame layout

| Byte | Name                  | Meaning                                              |
| ---- | --------------------- | ---------------------------------------------------- |
| 0    | CHECKSUM              | `(0x4D - sum(byte[2..15])) & 0xFF`                   |
| 1    | CMD_TYPE              | Reserved, almost always `0x00`                       |
| 2    | PACKET_DATA_SIZE      | Length of the data sub-packet (e.g. 0x04, 0x18, 0x0A) |
| 3    | ENCAP                 | Sub-command / address                                |
| 4    | DEVICE_TYPE           | Often 0x02 (config) or 0x04 (DPI value)              |
| 5    | MAIN                  | Primary parameter value                              |
| 6    | MAIN_ENCAP            | Local mini-checksum (see 3.3)                        |
| 7    | DATA_SIZE             | Length of data block                                 |
| 8    | SUB                   | Sub-parameter                                        |
| 9–14 | DATA                  | Payload                                              |
| 15   | (Padding / extra)     | Usually `0x00`                                       |

### 3.2 Global checksum

Confirmed by replaying multiple captures. The sum of **all 16 bytes** is
always `0x4D mod 256`. So:

```
byte[0] = (0x4D - sum(byte[2..15])) & 0xFF
```

This was derived from the official bundle's `calculateCrc` function
(`return 255 & data.reduce((a,b)=>a+b, 0)`) combined with the
`CHECKSUM_SPLIT_INDEX = 2` constant.

### 3.3 Local mini-checksum (byte 6)

For frames where byte 4 is `DEVICE_TYPE` and byte 5 is `MAIN`:

```
byte[6] = 0x57 - byte[4] - byte[5]
```

Verified across DPI-stage, polling-rate and LOD frames.

### 3.4 Confirmed commands (from live HID sniffs)

| Action                  | Frame (hex)                                                | Notes |
| ----------------------- | ---------------------------------------------------------- | ----- |
| Status poll (loop ~5 s) | `03 00 00 00 00 00 00 00 00 00 00 00 00 00 00 4a`          | Answer carries connection + battery |
| Battery query           | `04 00 00 00 00 00 00 00 00 00 00 00 00 00 00 49`          | Answer e.g. `04 00 00 00 02 3C 00 0F BA ...` – byte 5 (0x3C) = 60 % |
| Select DPI stage 1      | `07 00 00 04 02 00 55 00 00 00 00 00 00 00 00 eb`          | Active stage = byte 5 (0..3) |
| Select DPI stage 2      | `07 00 00 04 02 01 54 00 00 00 00 00 00 00 00 eb`          | |
| Select DPI stage 3      | `07 00 00 04 02 02 53 00 00 00 00 00 00 00 00 eb`          | |
| Select DPI stage 4      | `07 00 00 04 02 03 52 00 00 00 00 00 00 00 00 eb`          | |
| Set DPI value (5600 on stage 4) | `07 00 00 18 04 6f 6f 00 77 00 00 00 00 00 00 d5` | `5600/50 - 1 = 111 = 0x6F`; byte 8 (`0x77`) appears related to stage colour/slot |
| Polling rate 250 Hz     | `07 00 00 00 02 04 51 00 00 00 00 00 00 00 00 ef`          | byte 5 = `0x04` |
| Polling rate 2000 Hz    | `07 00 00 00 02 10 45 00 00 00 00 00 00 00 00 ef`          | byte 5 = `0x10` |
| Polling rate 8000 Hz    | `07 00 00 00 02 40 15 00 00 00 00 00 00 00 00 ef`          | byte 5 = `0x40` |
| LOD 0.7 mm              | `07 00 00 0a 02 03 52 00 00 00 00 00 00 00 00 e5`          | byte 5 = `0x03` |
| LOD 2 mm                | `07 00 00 0a 02 02 53 00 00 00 00 00 00 00 00 e5`          | byte 5 = `0x02` |
| DPI LED off             | `07 00 00 52 02 00 55 00 00 00 00 00 00 00 00 9d`          | only apply frame, no set |
| DPI LED solid (set)     | `07 00 00 4c 02 01 54 00 00 00 00 00 00 00 00 a3`          | byte 5 = `0x01` |
| DPI LED solid (apply)   | `07 00 00 52 02 01 54 00 00 00 00 00 00 00 00 9d`          | apply is binary: 0x01=active, 0x00=off |
| DPI LED breathing (set) | `07 00 00 4c 02 02 53 00 00 00 00 00 00 00 00 a3`          | byte 5 = `0x02` |
| DPI LED breathing (apply)| `07 00 00 52 02 01 54 00 00 00 00 00 00 00 00 9d`         | same apply frame as Solid |

### 3.5 Inferred but not yet verified

- Polling 125 Hz = `0x01`, 500 Hz = `0x08`, 1000 Hz = `0x0C`, 4000 Hz = `0x20`
- LOD 1 mm = `0x01`
- DPI value encoding: byte 5 == byte 6 == `(value/50) - 1`; byte 8 might be the
  stage's colour/slot index – needs Phase 2 verification.
- Sleep timer, debounce, ripple, angle snapping, motion sync, work mode,
  button remap, profile switching, save, factory reset – all unsniffed yet.

These get verified in Phase 2 with the sniffer harness described in section 6.

## 4. App Architecture

- **Stack:** Tauri 1.5 + Rust backend, React 18 + TypeScript + Vite frontend,
  TailwindCSS for styling (custom dark palette), `lucide-react` for icons,
  `i18next` + `react-i18next` for localisation, `react-i18next` browser language
  detector.
- **HID:** `hidapi` (Rust crate) version 2.6. Open the device by enumerating and
  picking the interface where `usage_page == 0xFF02 && usage == 0x0002`.
  hidapi auto-handles report-id byte prepending on write.
- **Backend layout** under `src-tauri/src/`:
  - `protocol.rs` — frame builders, checksum helpers, command enums.
    Include unit tests that replay the captured frames byte-for-byte.
  - `device.rs` — `Device` struct wrapping `HidDevice`, plus a global
    `Mutex<Option<Device>>` with auto-reconnect on error.
  - `commands.rs` — `#[tauri::command]` wrappers exposed to the frontend.
  - `main.rs` — Tauri entry point.
- **Frontend layout** under `src/`:
  - `App.tsx` — shell with sidebar + tab content.
  - `components/Sidebar.tsx` — device list, profile list, language switcher.
  - `components/TopBar.tsx` — tab strip + live battery/connection indicator
    (poll `cmd_status` every 5 s).
  - `components/tabs/{ButtonsTab, DpiTab, PerformanceTab, AdvancedTab, OtherTab}.tsx`
  - `components/ui/` — small shadcn-style primitives (`Button`, `Card`,
    `Slider`, `Switch`, `RadioGroup`).
  - `lib/ipc.ts` — typed wrapper around `invoke()` for each Tauri command.
  - `i18n.ts`, `locales/de.json`, `locales/en.json`.

## 5. Tauri Commands (required)

The Rust side must expose at least:

```rust
cmd_status() -> StatusInfo
cmd_set_dpi_stage(stage: u8) -> ()
cmd_set_dpi_value(stage: u8, dpi: u16) -> ()
cmd_set_polling_rate(rate: PollingRate) -> ()
cmd_set_lod(lod: Lod) -> ()
cmd_raw(hex_frame: String) -> String   // escape-hatch for Phase 2 sniffing
```

`PollingRate` and `Lod` should be `serde`-tagged enums so they round-trip cleanly
from TypeScript. `StatusInfo { connected: bool, battery_percent: u8,
raw_status: String, raw_battery: String }`.

## 6. Phase 2 Sniffer Harness (build later)

To verify the unverified bytes (section 3.5), the app should ship with a hidden
"Developer" panel reachable via Ctrl+Shift+D that:

1. Displays a textbox to type a 16-byte hex frame, sends it via `cmd_raw`, and
   shows the response.
2. Subscribes to a Tokio task in Rust that continuously reads from the device
   in the background and pushes inputs to the frontend via Tauri events.
3. Has a "diff capture" button that records all frames between two clicks
   and shows them as a table, so we can isolate which byte changes when the
   user toggles a single UI option.

This lets us crack the remaining commands (sleep, debounce, ripple, angle,
motion sync, work mode, button remap, profiles, save, reset) without going back
to the official tool.

## 7. UI Specification per Tab

### 7.1 DPI tab
- "DPI stage" dropdown (1..4) — calls `cmd_set_dpi_stage`.
- Four colour-coded cards (red/green/blue/magenta) showing the current value of
  each stage. Clicking selects that stage.
- A continuous slider from 50 to 42000, step 50 — debounced 200 ms before
  calling `cmd_set_dpi_value`.
- "DPI LED effect" group: Off / Solid / Breathing radio buttons +
  brightness slider (0–10) + speed slider (0–10). (Commands TBD in Phase 2.)

### 7.2 Performance tab
- **Sleep timer** slider (range guessed 0–300, step 1, unit "× 10 s").
- **Polling rate** radio group: 125 / 250 / 500 / 1000 / 2000 / 4000 / 8000.
  Mark 125, 500, 1000, 4000 as `(experimental)` until Phase 2.
- **Debounce time** slider (likely 1–20 ms).
- **Lift-off distance** radio: 0.7 mm / 1 mm / 2 mm. Mark 1 mm experimental.
- **Ripple control** switch.
- **Angle snapping** switch.
- **Motion Sync** switch.
- **Work mode** radio: Low Power / High Performance / Ultra Performance.

### 7.3 Buttons tab
Mouse rendering with 5 callouts (left, right, middle, forward, back). Each
opens a popover with action options: button click 1–5, scroll up/down, DPI
cycle/+/-/lock, media keys, modifier+key combo, macro. Saves TBD in Phase 2.

### 7.4 Advanced tab
Placeholder for now — sleep + wake settings live here in the original.

### 7.5 Other tab
- Firmware version display (TBD command).
- Factory reset button with confirmation.
- About / open source credits.

## 8. Translations

Use the key structure from the included locale files. Add new keys as features
arrive. Keep keys hierarchical, e.g. `performance.pollingRate`, never flat.

## 9. Build & Run

```
npm install
npm run tauri dev     # development
npm run tauri build   # produce installer in src-tauri/target/release/bundle
```

Windows prerequisites: Node 20+, Rust (rustup), Visual Studio Build Tools 2022
with the "Desktop development with C++" workload. WebView2 ships with
Windows 11.

## 10. Tests

`protocol.rs` must include unit tests that build each captured frame and
compare byte-for-byte against the hex strings in section 3.4. If any test
fails, the checksum/encoding logic is wrong.

## 11. Acceptance Criteria for First Run

- App starts, sidebar shows "FLY PRO".
- Top bar shows live battery percentage (matches what the official tool shows
  ± 1 %).
- Switching DPI stages 1→4 visibly changes the active stage on the mouse
  (the on-mouse LED colour cycles red/green/blue/magenta).
- Dragging the DPI slider on stage 4 changes the DPI smoothly.
- Polling-rate radio buttons for 250/2000/8000 Hz apply correctly (verifiable
  with an online click-rate / polling-rate test).
- LOD 0.7 mm and 2 mm settings apply.
- Switching the UI language between German and English works without a restart.

## 12. What NOT to do

- Do **not** introduce Electron, do **not** use `node-hid` — Rust + hidapi is
  the only path.
- Do **not** invent HID frames. If a feature is not in section 3.4, either
  mark the UI control as `(experimental)` and disabled, or wire it through
  `cmd_raw` for live capture in Phase 2.
- Do **not** localise via auto-translation. Use the provided JSON keys and
  ask me for any new strings that need wording.
```
---

## 13. UI Inventory – Verified Against Official Tool (2026-05-11)

This section overrides earlier rough specs in section 7 where they conflict.
Every label below was captured live from `https://qbz.ipigame.cn`. Original
Chinese strings are listed because they are the source of truth for i18n
extraction in section 14.

### 13.1 Global chrome

- **Sidebar**
  - Header: 我的设备 ("My devices") + chevron-left back arrow
  - Device card: shows mouse name (e.g. `FLY PRO`), highlighted when active
  - **Import button** below device card: 导入 ("Import / Importation")
  - Section heading: 配置文件 ("Configuration files")
  - Four on-board profile slots: 板载配置1 … 板载配置4 ("On-board configuration 1–4"),
    each with a three-dot context menu (rename / duplicate / clear — Phase 2)
  - Bottom-left language switcher (currently DE / EN only)
- **Top bar**
  - Five tabs (icons + label), in order:
    按键设置 / DPI设置 / 性能设置 / 高级设置 / 其他设置
  - Right-aligned status cluster:
    - Battery percentage with battery glyph (e.g. `81%`)
    - Connection mode: `2.4G连接` / `蓝牙连接` / `有线连接` ("2.4G / Bluetooth / Wired")
  - Both refresh from `cmd_status` every 5 s

### 13.2 Key Settings tab (按键设置)

Mouse render with **5 callouts**: 左键 / 右键 / 中键 / 前进 / 后退
(Left / Right / Middle / Forward / Back).

Clicking a callout opens an **action picker panel** (not a popover — fixed
left column ~440 px wide) with a search input and four top-level tabs:

| Tab key | 中文 | EN |
|---|---|---|
| `systemKeys` | 系统按键 | System keys |
| `keyboardKeys` | 键盘按键 | Keyboard keys |
| `shortcuts` | 指令 | Shortcuts |
| `macros` | 录制宏 | Record macro |

Inside **System keys**, groups (each collapsible):

- 鼠标 (Mouse): 左键 / 右键 / 中键 / 后退 / 前进
- 编辑 (Edit): 复制 / 粘贴 / 剪切 / 撤销 (Copy / Paste / Cut / Undo)
- 多媒体 (Multimedia): 播放/暂停 / 静音 / 暂停 / 上一首 / 下一首 / 音量+ / 音量-
- 系统 (System): 关闭窗口 / 锁定计算机 / 放大 / 缩小 / 显示桌面 / 任务管理器 / 保存 / 屏幕亮度+ / 屏幕亮度-

Inside **Shortcuts** (predefined Ctrl combos, scrollable list of ~20):
`Ctrl + .`, `Ctrl + ;`, `Ctrl + 0` (重置), `Ctrl + O` (打开), `Ctrl + A` (全选),
`Ctrl + C` (复制), `Ctrl + F` (搜索), `Ctrl + N` (新建), `Ctrl + S` (保存),
`Ctrl + T` (新建项), `Ctrl + V` (粘贴), `Ctrl + W` (关闭项), `Ctrl + X` (剪切), …

`keyboardKeys` and `macros` exist but content is Phase-2 (need their commands).

Assigning an action: in the original tool, the user **drags** an entry from the
panel onto a callout. For our app, click-to-assign is also acceptable. Selected
callout pill turns blue (see screenshot).

### 13.3 DPI tab (DPI设置)

- **DPI stage dropdown** ("DPI档位") at the top: values 1 / 2 / 3 / 4
- **Four colour-coded stage cards** below, default factory values shown:
  | Stage | Colour       | Default DPI |
  |-------|--------------|-------------|
  | 1     | red `#E53935`| 400         |
  | 2     | green `#43A047`| 800       |
  | 3     | blue `#1E88E5`| 1600       |
  | 4     | magenta `#D81B60`| 5600   |
  Clicking a card → active stage = that index → calls `cmd_set_dpi_stage`.
- **DPI slider**, range 50–42000, step 50, debounced 200 ms → `cmd_set_dpi_value(stage, dpi)`
- **DPI LED effect panel** (鼠标DPI灯效):
  - Radio: 关闭 / 常亮模式 / 呼吸模式 (Off / Solid / Breathing)
  - 亮度 ("Brightness") slider 0–10 **plus** a `[-][value][+]` stepper next to it
  - 速度 ("Speed") slider 0–10 **plus** stepper. Speed is hidden / disabled when
    effect is Off or Solid.

> Commands for DPI LED effect, brightness, speed are **unsniffed** — wire the
> radio/sliders through `cmd_raw` + the dev panel (section 6) for Phase 2.

### 13.4 Performance tab (性能设置)

Six cards, two columns:

1. **Sleep settings n × 10s** (休眠设置 (n * 10s))
   - Description: "在2.4G和蓝牙模式下，设备空闲指定时间后会自动进入休眠状态"
   - Single slider. Unit step = 10 s. Range: assume 0–30 (= 0 s … 300 s) until
     sniffed.

2. **Polling rate (Hz)** (轮询率设置 (Hz))
   - Description: "较高的鼠标轮询率，可以减少输入延迟的影响"
   - Radio group, **exactly these 7 values in this order**:
     `125 / 250 / 500 / 1000 / 2000 / 4000 / 8000`
   - Verified frames: 250 (0x04), 2000 (0x10), 8000 (0x40). Inferred but mark
     `(experimental)` until sniffed: 125, 500, 1000, 4000.

3. **Key debounce time (ms)** (按键消抖时间 (毫秒))
   - Description: "数值越低鼠标按键响应越快，数值越高则会提升稳定性 (数值不建议调太低，否则容易导致双击)"
   - Slider. Range tentatively 1–20 ms — confirm in Phase 2.

4. **LOD Silence Height** (LOD静默高度)
   - Description: "鼠标离开桌面停止运动的距离"
   - Radio: `0.7mm / 1mm / 2mm`
   - Verified frames: 0.7 mm (0x03), 2 mm (0x02). 1 mm = 0x01 inferred,
     mark `(experimental)`.

5. **Waveform control** (波纹控制)
   - Description: "鼠标在高速情况下进行算法修正以消除波浪形的抖动"
   - Single toggle. (**Not** "Ripple Control" — wave-form smoothing for
     high-speed jitter.)

6. **Linear correction** (直线修正)
   - Description: "鼠标在移动的时候会进行直线修正"
   - Single toggle.

7. **Motion Sync** (Motion Sync / 모션 싱크 in original — kept English)
   - Description: "传感器刷新周期的准确性和传感器移动数据的离散性"
   - Single toggle.

8. **Working modes** (工作模式)
   - Description: "在有线和无线大于1K回报率情况下，自动进入超性能模式"
   - Radio: 低功耗 / 高性能 / 超性能 (Low power / High performance / Ultra performance)

> Earlier draft (section 7.2) incorrectly listed both "Ripple Control" **and**
> a separate "Angle Snapping" toggle. The real UI has **Waveform Control** and
> **Linear Correction** instead. Angle Snapping as a boolean does **not**
> exist — it has been replaced by the Angle Mode dial in the Advanced tab
> (section 13.5).

### 13.5 Advanced tab (高级设置)

Five cards, two columns:

1. **Receiver LED indicator state** (接收器LED指示状态)
   - Description: "指示灯可帮助你快速判断接收器是否处于连接或工作状态"
   - Radio (3 options), each with a `(?)` tooltip:
     - 连接状态和回报率 ("Connection status and report rate")
     - 鼠标电池电量 ("Mouse battery level") — default
     - 仅电池警告 ("Battery warning only")

2. **Full firepower** (火力全开)
   - Description: "传感器LED灯亮亮，传感器处于最高性能的工作模式"
   - Toggle + a dropdown below for the auto-off timer.
   - Dropdown options (exactly): `10秒 / 30秒 / 1分钟 / 2分钟 / 3分钟 / 6分钟 / 10分钟 / 15分钟`
     (10s / 30s / 1min / 2min / 3min / 6min / 10min / 15min). Default `1分钟`.

3. **Long-distance mode** (远距离模式)
   - Description: "开启此模式后，使用距离更远，抗干扰能力更强，但耗电量也会更高"
   - Single toggle.

4. **20K FPS scan rate** (20K FPS扫描频率)
   - Description: "传感器扫描帧率达20000帧每秒，高帧率让鼠标定位更精准，但耗电量也会更高"
   - Single toggle.

5. **Mouse angle mode** (鼠标角度模式)
   - Description: "鼠标倾斜一定角度移动，光标仍然走直线"
   - Half-circle dial picker. Range -45° … +45°, step 9° (visible ticks: -45,
     -36, -27, -18, -9, 0, 9, 18, 27, 36, 45). Default 0°.

> Earlier draft (section 7.4) called Advanced a "placeholder". Replace with the
> five controls above. Until commands are sniffed (Phase 2), each control must
> live behind `cmd_raw` and be tagged with the badge `(experimental)`.

### 13.6 Other tab (其他设置)

Vertically stacked, centered:

- Large mouse hero image
- Read-only card: 鼠标固件版本 v?.??  ("Mouse firmware version"; observed `v3.01`)
- Read-only card: 接收器固件版本 v?.??  ("Receiver firmware version"; observed `v3.00`)
- **Factory reset card** (恢复出厂设置)
  - Description: "所有设置将恢复到出厂状态，请谨慎操作"
  - Button on the right: 恢复出厂 ("Factory reset"). Must show a confirm dialog
    before sending the command.

> Two **separate** firmware versions — not one. Add fields
> `mouse_fw: String, receiver_fw: String` to `StatusInfo` (or a new
> `cmd_firmware()` command).

---

## 14. i18n String Table (DE / EN)

Use these exact keys in `locales/de.json` and `locales/en.json`. Add nothing
auto-translated; ask before inventing new strings. Hierarchy is dot-namespaced
in JSON.

| Key | 中文 (source) | Deutsch | English |
|---|---|---|---|
| `app.title` | IPI驱动 | IPI Treiber | IPI Driver |
| `sidebar.myDevices` | 我的设备 | Meine Geräte | My devices |
| `sidebar.import` | 导入 | Importieren | Import |
| `sidebar.profiles` | 配置文件 | Profile | Profiles |
| `sidebar.profile` | 板载配置 | Profil | Profile |
| `topbar.connection.2g4` | 2.4G连接 | 2,4 GHz verbunden | 2.4 GHz connected |
| `topbar.connection.bluetooth` | 蓝牙连接 | Bluetooth verbunden | Bluetooth connected |
| `topbar.connection.wired` | 有线连接 | Kabelverbindung | Wired |
| `topbar.battery` | 电量 | Akku | Battery |
| `tabs.keys` | 按键设置 | Tasten | Keys |
| `tabs.dpi` | DPI设置 | DPI | DPI |
| `tabs.performance` | 性能设置 | Leistung | Performance |
| `tabs.advanced` | 高级设置 | Erweitert | Advanced |
| `tabs.other` | 其他设置 | Sonstiges | Other |
| `keys.left` | 左键 | Linke Taste | Left button |
| `keys.right` | 右键 | Rechte Taste | Right button |
| `keys.middle` | 中键 | Mittlere Taste | Middle button |
| `keys.forward` | 前进 | Vorwärts | Forward |
| `keys.back` | 后退 | Zurück | Back |
| `keys.picker.systemKeys` | 系统按键 | Systemtasten | System keys |
| `keys.picker.keyboardKeys` | 键盘按键 | Tastatur | Keyboard |
| `keys.picker.shortcuts` | 指令 | Befehle | Shortcuts |
| `keys.picker.macros` | 录制宏 | Makro aufnehmen | Record macro |
| `keys.group.mouse` | 鼠标 | Maus | Mouse |
| `keys.group.edit` | 编辑 | Bearbeiten | Edit |
| `keys.group.media` | 多媒体 | Medien | Multimedia |
| `keys.group.system` | 系统 | System | System |
| `keys.edit.copy` | 复制 | Kopieren | Copy |
| `keys.edit.paste` | 粘贴 | Einfügen | Paste |
| `keys.edit.cut` | 剪切 | Ausschneiden | Cut |
| `keys.edit.undo` | 撤销 | Rückgängig | Undo |
| `keys.media.playPause` | 播放/暂停 | Wiedergabe/Pause | Play/Pause |
| `keys.media.mute` | 静音 | Stumm | Mute |
| `keys.media.pause` | 暂停 | Pause | Pause |
| `keys.media.previous` | 上一首 | Vorheriger Titel | Previous |
| `keys.media.next` | 下一首 | Nächster Titel | Next |
| `keys.media.volumeUp` | 音量+ | Lauter | Volume up |
| `keys.media.volumeDown` | 音量- | Leiser | Volume down |
| `keys.system.closeWindow` | 关闭窗口 | Fenster schließen | Close window |
| `keys.system.lock` | 锁定计算机 | PC sperren | Lock PC |
| `keys.system.zoomIn` | 放大 | Vergrößern | Zoom in |
| `keys.system.zoomOut` | 缩小 | Verkleinern | Zoom out |
| `keys.system.showDesktop` | 显示桌面 | Desktop anzeigen | Show desktop |
| `keys.system.taskManager` | 任务管理器 | Task-Manager | Task manager |
| `keys.system.save` | 保存 | Speichern | Save |
| `keys.system.brightnessUp` | 屏幕亮度+ | Helligkeit + | Brightness + |
| `keys.system.brightnessDown` | 屏幕亮度- | Helligkeit - | Brightness - |
| `dpi.stage` | DPI档位 | DPI-Stufe | DPI stage |
| `dpi.slider` | DPI值 | DPI-Wert | DPI value |
| `dpi.led.title` | 鼠标DPI灯效 | DPI-LED-Effekt | DPI LED effect |
| `dpi.led.off` | 关闭 | Aus | Off |
| `dpi.led.solid` | 常亮模式 | Dauerlicht | Solid |
| `dpi.led.breathing` | 呼吸模式 | Atmen | Breathing |
| `dpi.led.brightness` | 亮度 | Helligkeit | Brightness |
| `dpi.led.speed` | 速度 | Geschwindigkeit | Speed |
| `perf.sleep.title` | 休眠设置 (n * 10s) | Ruhezeit (n × 10 s) | Sleep timer (n × 10 s) |
| `perf.sleep.desc` | 在2.4G和蓝牙模式下，设备空闲指定时间后会自动进入休眠状态 | Im 2,4-GHz- und Bluetooth-Modus geht das Gerät nach der eingestellten Leerlaufzeit in den Ruhezustand. | In 2.4 GHz and Bluetooth modes, the device enters sleep after the configured idle time. |
| `perf.polling.title` | 轮询率设置 (Hz) | Abfragerate (Hz) | Polling rate (Hz) |
| `perf.polling.desc` | 较高的鼠标轮询率，可以减少输入延迟的影响 | Eine höhere Abfragerate verringert die Eingabeverzögerung. | A higher polling rate reduces input lag. |
| `perf.debounce.title` | 按键消抖时间 (毫秒) | Tasten-Entprellzeit (ms) | Key debounce time (ms) |
| `perf.debounce.desc` | 数值越低鼠标按键响应越快，数值越高则会提升稳定性（数值不建议调太低，否则容易导致双击） | Niedriger = schnellere Reaktion. Höher = stabiler. Zu niedrig führt zu Doppelklicks. | Lower = faster response. Higher = more stable. Too low causes double-clicks. |
| `perf.lod.title` | LOD静默高度 | Abhebehöhe (LOD) | Lift-off distance |
| `perf.lod.desc` | 鼠标离开桌面停止运动的距离 | Höhe, bei der die Maus die Bewegungserkennung stoppt. | Distance at which the mouse stops tracking. |
| `perf.waveform.title` | 波纹控制 | Wellenform-Korrektur | Waveform control |
| `perf.waveform.desc` | 鼠标在高速情况下进行算法修正以消除波浪形的抖动 | Algorithmische Korrektur gegen wellenförmiges Jittern bei hohen Geschwindigkeiten. | Algorithmic correction of wave-like jitter at high speeds. |
| `perf.linear.title` | 直线修正 | Linearkorrektur | Linear correction |
| `perf.linear.desc` | 鼠标在移动的时候会进行直线修正 | Korrigiert Mausbewegungen entlang der Bewegungsachse. | Corrects movement along its path. |
| `perf.motionSync.title` | Motion Sync | Motion Sync | Motion Sync |
| `perf.motionSync.desc` | 传感器刷新周期的准确性和传感器移动数据的离散性 | Synchronisiert Sensor-Refresh und Datenausgabe. | Synchronises sensor refresh with data output. |
| `perf.workMode.title` | 工作模式 | Arbeitsmodus | Working mode |
| `perf.workMode.desc` | 在有线和无线大于1K回报率情况下，自动进入超性能模式 | Bei kabelgebundenem Betrieb und über 1 kHz wechselt das Gerät automatisch in den Ultra-Modus. | When wired or polling > 1 kHz, the device switches to ultra mode automatically. |
| `perf.workMode.low` | 低功耗 | Stromsparend | Low power |
| `perf.workMode.high` | 高性能 | Hohe Leistung | High performance |
| `perf.workMode.ultra` | 超性能 | Ultra-Leistung | Ultra performance |
| `adv.receiverLed.title` | 接收器LED指示状态 | Empfänger-LED | Receiver LED |
| `adv.receiverLed.desc` | 指示灯可帮助你快速判断接收器是否处于连接或工作状态 | Die LED zeigt Verbindungs- und Akkustatus des Empfängers. | The LED shows connection and battery status. |
| `adv.receiverLed.connection` | 连接状态和回报率 | Verbindung & Abfragerate | Connection & polling rate |
| `adv.receiverLed.battery` | 鼠标电池电量 | Maus-Akkustand | Mouse battery level |
| `adv.receiverLed.warningOnly` | 仅电池警告 | Nur Akku-Warnung | Battery warning only |
| `adv.firepower.title` | 火力全开 | Volllast-Modus | Full firepower |
| `adv.firepower.desc` | 传感器LED灯亮亮，传感器处于最高性能的工作模式 | Sensor läuft auf maximaler Leistung. | Sensor runs at maximum performance. |
| `adv.firepower.timer.10s` | 10秒 | 10 s | 10 s |
| `adv.firepower.timer.30s` | 30秒 | 30 s | 30 s |
| `adv.firepower.timer.1m` | 1分钟 | 1 min | 1 min |
| `adv.firepower.timer.2m` | 2分钟 | 2 min | 2 min |
| `adv.firepower.timer.3m` | 3分钟 | 3 min | 3 min |
| `adv.firepower.timer.6m` | 6分钟 | 6 min | 6 min |
| `adv.firepower.timer.10m` | 10分钟 | 10 min | 10 min |
| `adv.firepower.timer.15m` | 15分钟 | 15 min | 15 min |
| `adv.longRange.title` | 远距离模式 | Weitreichen-Modus | Long-distance mode |
| `adv.longRange.desc` | 开启此模式后，使用距离更远，抗干扰能力更强，但耗电量也会更高 | Größere Reichweite und höhere Störfestigkeit, dafür mehr Stromverbrauch. | Longer range and better interference resistance at the cost of battery life. |
| `adv.fps20k.title` | 20K FPS扫描频率 | 20K-FPS-Sensor | 20K FPS scan rate |
| `adv.fps20k.desc` | 传感器扫描帧率达20000帧每秒，高帧率让鼠标定位更精准，但耗电量也会更高 | 20 000 Sensor-Frames pro Sekunde für präzisere Positionierung; höherer Stromverbrauch. | 20 000 sensor frames per second for more precise tracking; higher power draw. |
| `adv.angleMode.title` | 鼠标角度模式 | Winkelmodus | Angle mode |
| `adv.angleMode.desc` | 鼠标倾斜一定角度移动，光标仍然走直线 | Der Cursor bewegt sich gerade, auch wenn die Maus geneigt geführt wird. | Cursor moves in a straight line even if the mouse is held at an angle. |
| `other.mouseFw` | 鼠标固件版本 | Maus-Firmware | Mouse firmware |
| `other.receiverFw` | 接收器固件版本 | Empfänger-Firmware | Receiver firmware |
| `other.reset.title` | 恢复出厂设置 | Auf Werkseinstellungen zurücksetzen | Factory reset |
| `other.reset.desc` | 所有设置将恢复到出厂状态，请谨慎操作 | Alle Einstellungen werden zurückgesetzt. Vorsichtig verwenden. | All settings will be reset. Use with care. |
| `other.reset.button` | 恢复出厂 | Zurücksetzen | Reset |
| `other.reset.confirm` | — | Bist du sicher, dass du auf Werkseinstellungen zurücksetzen möchtest? | Are you sure you want to factory reset? |
| `common.experimental` | — | (experimentell) | (experimental) |
| `common.save` | — | Speichern | Save |
| `common.cancel` | — | Abbrechen | Cancel |

> Translation rules: never auto-translate, never paraphrase. If a string is
> missing, ask the user for the exact wording instead of inventing.

---

## 15. Phase 2 Sniffer Hit List

The dev panel (section 6, `Ctrl+Shift+D`) must make it trivial to crack the
following commands. For each row, follow exactly the **Trigger steps** while
the panel's "Diff capture" mode is active, then dump the resulting frames.
Every unknown command will resolve to a single 16-byte HID write on Report ID 8.

| # | Feature | Trigger steps (open official tool side-by-side) | Expected frame shape |
|---|---|---|---|
| 1 | DPI value byte 8 meaning | Set stage 1 to DPI 400, 800, 1600, 5600 in turn. Then set stage 2 to 400. | Identify whether byte 8 = stage colour, slot, or always 0x77 |
| 2 | DPI LED effect Off/Solid/Breathing | Toggle radio 3× | byte 4=DEVICE_TYPE for "LED mode" |
| 3 | DPI LED brightness | Slide brightness 0 → 10 | watch byte 5 increment |
| 4 | DPI LED speed | Slide speed 0 → 10 (only available in Breathing) | watch byte 5 |
| 5 | Sleep timer | Slide slider to extreme left, then extreme right | Two captures, diff for byte mapping & range |
| 6 | Polling 125 Hz | Click radio | confirm 0x01 |
| 7 | Polling 500 Hz | Click radio | confirm 0x08 |
| 8 | Polling 1000 Hz | Click radio | confirm 0x0C |
| 9 | Polling 4000 Hz | Click radio | confirm 0x20 |
| 10 | Debounce time | Slide to min, slide to max | discover byte mapping and unit |
| 11 | LOD 1 mm | Click radio | confirm 0x01 in byte 5 |
| 12 | Waveform control | Toggle on / off | likely byte 5 = 0/1, byte 4 = new DEVICE_TYPE |
| 13 | Linear correction | Toggle on / off | as above |
| 14 | Motion sync | Toggle on / off | as above |
| 15 | Working mode Low Power | Click radio | byte 5 |
| 16 | Working mode High Perf. | Click radio | byte 5 |
| 17 | Working mode Ultra Perf. | Click radio | byte 5 |
| 18 | Receiver LED — connection | Click radio | new DEVICE_TYPE |
| 19 | Receiver LED — battery | Click radio | byte 5 |
| 20 | Receiver LED — warning only | Click radio | byte 5 |
| 21 | Full firepower toggle | Click toggle on, then off | byte 5 0/1 |
| 22 | Full firepower timer | Cycle dropdown through all 8 values | byte 5 mapping |
| 23 | Long-distance mode | Toggle | byte 5 0/1 |
| 24 | 20K FPS scan rate | Toggle | byte 5 0/1 |
| 25 | Mouse angle | Dial to -45, -36, … 0 … 36, 45 | byte 5 = angle/9 + offset? |
| 26 | Button remap (left → forward) | Drag "前进" onto 左键 | likely multi-byte: which-button + which-action |
| 27 | Profile switch | Click 板载配置2 | watch for a "select profile" frame |
| 28 | Profile save | Trigger any change → official tool auto-saves | likely a separate commit/save frame |
| 29 | Factory reset | Click 恢复出厂 → confirm | discover the reset opcode |
| 30 | Macro recording | 录制宏 tab → record a 2-key macro | likely multi-frame transfer |

For each row, paste the captured hex frame back into `protocol.rs` (section
3.4) and add a matching unit test before wiring the UI control out from
`cmd_raw` into a dedicated typed command.

---

## 16. Open questions for the user (
---
