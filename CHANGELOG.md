# Changelog

All notable changes to the IPI STAY FLY Driver are documented in this file.

## [1.4.0] - 2026-07-02

Full-project review release: every finding from a top-to-bottom audit of the driver was fixed.

### Fixed — protocol / hardware communication

- **DPI writes now target the correct stage slot.** `cmd_set_dpi` previously ignored the stage argument and always wrote to stage 4's config address (`0x18`); changing DPI for stages 1–3 modified stage 4 instead. Each stage now writes to its own slot (`0x0C + 4 × stage`), matching the layout the driver itself reads back.
- **DPI writes now compute the inner checksum instead of hardcoding `0x77`.** Byte 8 of the DPI frame is the same `0x55 − payload` block-write checksum used by button remapping; it was hardcoded to the one captured value, so any DPI other than 5600 sent an invalid frame. All DPI values now produce a correct checksum (verified against the original capture).
- **DPI values above 12800 no longer silently truncate.** The raw DPI encoding (`dpi/50 − 1`) overflows one byte above 12800; the high bits are now carried in byte 7 (and decoded on read-back) instead of being cut off, so e.g. 42000 DPI no longer writes as 3650 DPI. Values above 12800 are extrapolated from the encoding and marked as such in the code.
- **Late HID replies can no longer be attributed to the wrong command.** Pending input reports are drained before every write/read exchange, so a response that arrives after a timeout is discarded instead of being parsed as the next command's reply.
- **Unplug/replug now recovers immediately.** Any failed command drops the cached device handle so the next call re-opens the device; previously only the 5-second status poll did this, so writes could keep failing for up to 5 s after reconnecting.
- **Input validation on all write commands.** DPI stage (0–3), DPI value (50–42000, step 50), debounce (0–20 ms), work mode (0–2), full-power mode (0–1), receiver LED mode (1–3) and angle (−45…45) are validated before any frame is sent to the mouse.

### Fixed — demo mode & connection handling

- **Button remapping no longer sends real HID writes in demo mode.** The Buttons tab was the only tab not wired to demo mode / connection state; it now skips hardware calls in demo mode (as the README promises) and disables its controls when no mouse is connected.
- **The hidden tray flyout no longer polls the hardware forever.** The tray window polled the mouse every 3 seconds even when it had never been opened (and even in demo mode); it now only polls while actually visible and refreshes immediately when shown.
- **"Connect" in the Add Device dialog now refreshes the UI immediately.** It previously fired a status query whose result was thrown away, so the device card didn't update until the next 5-second poll.

### Fixed — UI state & error handling

- **Settings are read back from the mouse everywhere.** The Lighting tab (LED mode, brightness, breathing speed), Advanced tab (full-power mode, rage-time duration, 20K FPS, angle snapping) and the debounce slider previously showed hardcoded defaults after every restart; they now hydrate from the device. Button mappings are also read back from the mouse (new `cmd_read_buttons` command), so the Buttons tab reflects the real assignments after a restart.
- **You can actually type a DPI value now.** The DPI number field clamped/normalized on every keystroke (typing "8" on the way to "800" instantly became 50); it now keeps your raw input while editing and commits on Enter or blur.
- **Hardware write failures are no longer silent.** Every settings handler used an empty `catch {}`; failures now show an error toast, and discrete controls (switches, radios, polling rate, LOD, buttons) roll back to their previous state so the UI never claims a setting the mouse didn't accept.
- **Angle-snapping slider writes are debounced.** Dragging the slider fired one HID write per tick; it now settles for 150 ms before writing.
- **Oversized custom wallpapers can no longer white-screen the app.** `localStorage` quota errors while persisting the wallpaper (or theme/background preferences) are caught; the wallpaper simply won't persist and a toast explains why.
- **Removed the dead "Diff Capture" feature from the developer panel.** It never recorded anything — the capture buffer had no writer — so the UI was removed rather than shipping a broken tool.

### Fixed — internationalization

- Added the missing `buttons.keyboardKey` translation to es, es-MX, fr, it, pl, pt and zh (it previously fell back to English).
- Translated every hardcoded English string: section headers ("Sensor tuning", "Latency control", "Device behavior", …), the demo-mode banner and badge, the Buttons tab (button names, action names, "Restore Default", save/restore status messages), the entire Angle Snapping card, the Add Device dialog, the tray flyout, the background picker (including animation names), window-control tooltips, and error toasts — in all 9 languages.
- Removed the now-unused developer-panel capture strings and the obsolete `buttons.placeholder` string from all locales. All locales are verified to have identical key sets (144 keys).

### Security & robustness

- **Content Security Policy enabled.** The Tauri webview previously ran with `csp: null`; a restrictive CSP now applies as defense-in-depth (relevant because the `cmd_raw` dev command can send arbitrary HID frames).
- Documented in the README that release binaries are unsigned (Windows SmartScreen will warn) and that the app has no auto-updater.

### Added

- `cmd_read_buttons` Tauri command: reads the live button-slot assignments (category/code/modifier per physical button) from the mouse.
- Extended `cmd_read_settings`: now also returns debounce, DPI LED mode/brightness, breathing speed, 20K FPS, and angle-snapping state.
- Toast notification system for surfacing hardware errors.
- 8 new protocol unit tests (stage addressing, inner checksum, high-DPI encoding); 72 total, all capture-anchored tests still pass.
