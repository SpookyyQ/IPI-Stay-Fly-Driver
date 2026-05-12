# Mouse WebHID Sniffer

Local Chrome extension for capturing WebHID frames from mouse web drivers.

Supported pages:

- `https://hub.atk.pro` for ATK / VXE devices
- `https://qbz.ipigame.cn` for the IPI FLY PRO

The overlay also records UI actions (`click`, `change`, `input`) and attaches the
most recent action to following HID frames. This makes it easier to see which
button, radio option, dropdown item, or slider value caused a frame.

## Install

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder:
   `C:\Users\jason\Desktop\IPI STAY FLY driver\tools\webhid-sniffer-extension`
5. Open or reload `https://hub.atk.pro`.

## Capture ATK FIERCE X Device Info

1. Connect the ATK FIERCE X receiver or cable.
2. Open `https://hub.atk.pro` in Chrome or Edge.
3. Use the site button that asks for browser/device access.
4. Select the ATK FIERCE X in the browser permission dialog.
5. In the sniffer overlay, click `Copy all`.
6. Send the copied JSON back for decoding.

This first capture is important because it contains:

- `vendorId` / `productId`
- HID collections with usage pages/usages
- input/output/feature report IDs

## Capture One Setting

1. In the official tool, connect/select the mouse.
2. In the sniffer overlay, click `Clear`.
3. Change exactly one setting, for example polling rate to `1000 Hz`.
4. Click `Copy hex` or `Export JSON`.
5. Send the copied/exported result back for decoding.

Use the same flow for each setting we want to support. Good first targets:

- DPI stage selection
- DPI value change
- polling rates: `125`, `250`, `500`, `1000`, `2000`, `4000`, `8000`
- lift-off distance
- debounce time
- motion sync / angle / sensor options

`Copy hex` lines include the linked UI action at the end when detected, for
example:

```text
12 out sendReport report 8 07 ... <= click: 1000 Hz
```

`Copy all` is better for the first device discovery capture because it includes
the full JSON metadata. `Copy hex` is better once we are isolating individual
commands.
