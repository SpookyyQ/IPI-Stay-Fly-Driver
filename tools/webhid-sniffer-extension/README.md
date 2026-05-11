# IPI FLY PRO WebHID Sniffer

Local Chrome extension for capturing WebHID frames from `https://qbz.ipigame.cn`.

The overlay also records UI actions (`click`, `change`, `input`) and attaches the
most recent action to following HID frames. This makes it easier to see which
button, radio option, dropdown item, or slider value caused a frame.

## Install

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder:
   `C:\Users\jason\Desktop\IPI STAY FLY driver\tools\webhid-sniffer-extension`
5. Open or reload `https://qbz.ipigame.cn`.

## Capture Polling 1000 Hz

1. In the official tool, connect/select the FLY PRO.
2. In the sniffer overlay, click `Clear`.
3. Change only the polling rate to `1000 Hz`.
4. Click `Copy hex` or `Export JSON`.
5. Send the copied/exported result back for decoding.

Use the same flow for `125`, `500`, and `4000 Hz`.

`Copy hex` lines include the linked UI action at the end when detected, for
example:

```text
12 out sendReport report 8 07 ... <= click: 1000 Hz
```
