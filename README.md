# IPI STAY FLY Driver

> Open-source replacement driver for the **IPI FLY PRO** wireless gaming mouse.

The official IPI FLY PRO web driver is closed-source and Windows-only. This project reverse-engineers the HID protocol and rebuilds the full configuration UI as a native desktop app — faster, lighter, and open.

<!-- screenshots will be added soon -->

## Features

- **DPI** — 4 configurable stages (50–42,000 DPI), LED mode (Off / Solid / Breathing), brightness & speed
- **Performance** — Polling rate (125–8000 Hz), lift-off distance, sleep timer, key debounce, work mode
- **Lightning** — LED mode, brightness, breathing speed
- **Advanced** — Receiver LED indicator, long-distance mode, full-power / rage mode with rage-time, 20K FPS sensor mode
- **Other** — Mouse specs, factory reset
- **Home screen** — Device detection with USB device picker
- Frameless native window with custom title bar
- German / English UI
- No telemetry, no account required

## Hardware

| Field | Value |
|---|---|
| Vendor ID | `0x3554` |
| Product ID | `0xF517` |
| Sensor | PixArt PAW3950 |
| Polling rate | 125 / 250 / 500 / 1000 / 2000 / 4000 / 8000 Hz |
| DPI range | 50 – 42,000 |
| Switches | Omron (mechanical) |
| Weight | 48 g ± 2 g |
| Connectivity | 2.4 GHz wireless · Bluetooth · USB wired |
| Battery | 300 mAh |
| Chip | Nordic 54L15 |

## Tech Stack

- [Tauri 1.5](https://tauri.app) — Rust backend + WebView2 frontend
- [React 18](https://react.dev) + TypeScript + Vite
- [Tailwind CSS v3](https://tailwindcss.com)
- [hidapi](https://crates.io/crates/hidapi) — HID communication
- [i18next](https://www.i18next.com) — DE / EN localisation

## Prerequisites

- **Windows 10/11** (WebView2 required — ships with Windows 11; install separately on Windows 10)
- [Node.js 20+](https://nodejs.org)
- [Rust](https://rustup.rs)
- Visual Studio Build Tools 2022 with **"Desktop development with C++"** workload

## Getting Started

```sh
git clone https://github.com/jasonbedra/ipi-stay-fly-driver.git
cd ipi-stay-fly-driver
npm install
npm run tauri dev
```

## Build

```sh
npm run tauri build
# Installer: src-tauri/target/release/bundle/
```

## Protocol

All frames are 16 bytes, Report ID 8. Byte 0 is a global checksum:

```
byte[0] = (0x4D - sum(byte[2..=15])) & 0xFF
```

See [`src-tauri/src/protocol.rs`](src-tauri/src/protocol.rs) for all reverse-engineered commands with captured frames as unit tests.

## Running Tests

```sh
cd src-tauri
cargo test
```

## Developer Panel

Press **Ctrl+Shift+D** in the running app to open the raw HID frame panel for debugging and protocol exploration.

## Contributing

Pull requests are welcome. If you own an IPI FLY PRO and can capture USB traffic for unimplemented features (button remapping, sensor angle, etc.) please open an issue.

## License

[MIT](LICENSE)
