# ATK FIERCE X Protocol Notes

Capture source: `https://hub.atk.pro/` with `tools/webhid-sniffer-extension`.

## Device

| Field | Value |
| --- | --- |
| Product string | `ATK Mouse 8K Dongle` |
| Vendor ID | `0x373B` |
| Product ID | `0x101B` |
| WebHID report ID | `8` |
| Frame size | 16 bytes |

## Confirmed Frame Shape

The ATK FIERCE X uses the same 16-byte report style as the IPI FLY PRO.

The global checksum appears to match the existing rule:

```txt
byte[0] = (0x4D - sum(byte[2..=15])) & 0xFF
```

Examples:

```txt
10 00 00 00 00 00 00 00 00 00 00 00 00 00 00 3d
12 00 00 00 00 00 00 00 00 00 00 00 00 00 00 3b
03 00 00 00 00 00 00 00 00 00 00 00 00 00 00 4a
04 00 00 00 00 00 00 00 00 00 00 00 00 00 00 49
```

## Startup / Discovery Frames

These frames were observed when selecting/opening the ATK FIERCE X in ATK V HUB.

| Direction | Frame | Notes |
| --- | --- | --- |
| out | `10 00 00 00 00 00 00 00 00 00 00 00 00 00 00 3d` | Device info query |
| in | `10 00 00 00 03 02 2c 27 00 00 00 00 00 00 00 e5` | Device info response |
| out | `12 00 00 00 00 00 00 00 00 00 00 00 00 00 00 3b` | Device info query |
| in | `12 00 00 00 02 02 18 00 00 00 00 00 00 00 00 1f` | Device info response |
| out | `03 00 00 00 00 00 00 00 00 00 00 00 00 00 00 4a` | Status query |
| in | `03 00 00 00 01 01 8c 66 86 00 00 00 00 00 00 d0` | Status response |
| out | `04 00 00 00 00 00 00 00 00 00 00 00 00 00 00 49` | Battery query |
| in | `04 00 00 00 02 5f 00 10 01 00 00 00 00 00 00 d7` | Battery response, byte 5 likely `0x5f` = 95% |
| out | `01 00 00 00 08 bd 70 d7 d6 00 00 00 00 00 00 6a` | Unknown dynamic query |
| in | `01 00 00 00 08 2f e3 5b 15 02 2c 05 00 00 00 8f` | Unknown dynamic response |
| out | `1d 00 00 00 00 00 00 00 00 00 00 00 00 00 00 30` | Unknown query |
| in | `1d 01 00 00 00 00 00 00 00 00 00 00 00 00 00 2f` | Unknown response |

## Read Frames

ATK V HUB performs block reads after selecting the device. These appear to use
the same block-read family as IPI, with byte 3 as the address and byte 4 as the
read length.

| Direction | Frame | Notes |
| --- | --- | --- |
| out | `08 00 00 60 08 00 00 00 00 00 00 00 00 00 00 dd` | Read addr `0x60`, len `0x08` |
| in | `08 00 00 60 08 01 01 00 53 01 02 00 52 00 00 33` | Data |
| out | `08 00 00 68 08 00 00 00 00 00 00 00 00 00 00 d5` | Read addr `0x68`, len `0x08` |
| in | `08 00 00 68 08 01 04 00 50 01 08 00 4c 00 00 2b` | Data |
| out | `08 00 00 70 08 00 00 00 00 00 00 00 00 00 00 cd` | Read addr `0x70`, len `0x08` |
| in | `08 00 00 70 08 01 10 00 44 02 01 00 52 00 00 23` | Data |
| out | `08 00 00 a9 0a 00 00 00 00 00 00 00 00 00 00 92` | Read addr `0xA9`, len `0x0A` |
| in | `08 00 00 a9 0a 08 4d 00 55 05 50 00 55 00 55 e9` | Data |
| out | `08 00 00 00 08 00 00 00 00 00 00 00 00 00 00 3d` | Read addr `0x00`, len `0x08` |
| in | `08 00 00 00 08 20 35 04 51 01 54 00 55 00 00 e9` | Data |
| out | `08 00 00 bd 04 00 00 00 00 00 00 00 00 00 00 84` | Read addr `0xBD`, len `0x04` |
| in | `08 00 00 bd 04 ff ff ff ff 00 00 00 00 00 00 88` | Data |

## Write Frames

ATK V HUB appears to use `0x07` for block writes. The device echoes the accepted
frame as the input report.

| Direction | Frame | UI action | Notes |
| --- | --- | --- | --- |
| out | `07 00 00 00 08 20 35 04 51 00 55 00 00 00 00 3f` | Board configuration / red value `#ff0000` capture | Write addr `0x00`, len `0x08`; response echoed the same frame |
| in | `07 00 00 00 08 20 35 04 51 00 55 00 00 00 00 3f` | Same | Echo/ack |
| out | `07 00 00 00 08 20 35 04 51 01 54 00 00 00 00 3f` | DPI stage click | Select stage 2 |
| in | `07 00 00 00 08 20 35 04 51 01 54 00 00 00 00 3f` | Same | Echo/ack |
| out | `07 00 00 00 08 20 35 04 51 02 53 00 00 00 00 3f` | DPI stage click | Select stage 3 |
| in | `07 00 00 00 08 20 35 04 51 02 53 00 00 00 00 3f` | Same | Echo/ack |
| out | `07 00 00 00 08 20 35 04 51 03 52 00 00 00 00 3f` | DPI stage click | Select stage 4 |
| in | `07 00 00 00 08 20 35 04 51 03 52 00 00 00 00 3f` | Same | Echo/ack |

Comparison with the earlier read of addr `0x00`:

```txt
Read response: 08 00 00 00 08 20 35 04 51 01 54 00 55 00 00 e9
Write frame:   07 00 00 00 08 20 35 04 51 00 55 00 00 00 00 3f
```

Likely meaning:

- bytes 5/6: value/check pair `0x20 0x35`
- bytes 7/8: value/check pair `0x04 0x51`
- bytes 9/10: value/check pair changed from `0x01 0x54` to `0x00 0x55`
- the check byte follows `0x55 - value`

## Confirmed Commands

### Select Active DPI Stage

The active DPI stage is written through the block at addr `0x00`, len `0x08`.
The stage value is stored in bytes 9/10 as a value/check pair.

```txt
stage 1: 07 00 00 00 08 20 35 04 51 00 55 00 00 00 00 3f
stage 2: 07 00 00 00 08 20 35 04 51 01 54 00 00 00 00 3f
stage 3: 07 00 00 00 08 20 35 04 51 02 53 00 00 00 00 3f
stage 4: 07 00 00 00 08 20 35 04 51 03 52 00 00 00 00 3f
```

Rust builder shape:

```txt
byte[0] = global checksum
byte[3] = 0x00
byte[4] = 0x08
byte[5..8] = 20 35 04 51
byte[9] = stage index 0..3
byte[10] = 0x55 - stage index
byte[15] = 0x3f
```

### DPI Value Blocks

Changing a DPI number causes ATK V HUB to write four 8-byte blocks. In the
capture below only the second 4-byte group of addr `0x0C` changed while the
other blocks were re-written unchanged.

```txt
07 00 00 0c 08 4f 4f 00 b7 b4 b4 00 ed 00 00 88
07 00 00 14 08 59 59 00 a3 9f 9f 00 17 00 00 80
07 00 00 1c 08 3f 3f 44 93 3f 3f 44 93 00 00 78
07 00 00 24 08 3f 3f 44 93 3f 3f 44 93 00 00 70
```

Repeated clicks on `increase number` changed only the second group in addr
`0x0C`:

```txt
b4 b4 00 ed
b5 b5 00 eb
b6 b6 00 e9
b7 b7 00 e7
b8 b8 00 e5
```

Likely DPI group shape:

```txt
[raw, raw, flags_or_hi, group_check]
```

For the observed `flags_or_hi = 0x00` DPI groups:

```txt
group_check = (0x255 - raw - raw - flags_or_hi) & 0xFF
```

This matches:

```txt
raw 0x4f -> check 0xb7
raw 0xb4 -> check 0xed
raw 0xb8 -> check 0xe5
raw 0x59 -> check 0xa3
raw 0x9f -> check 0x17
```

The likely DPI encoding is:

```txt
dpi = (raw + 1) * 10
raw = (dpi / 10) - 1
```

Examples:

```txt
0x4f = 79  -> 800 DPI
0x59 = 89  -> 900 DPI
0x9f = 159 -> 1600 DPI
```

`0xb4` is ambiguous without the exact UI value: it could represent `1810 DPI`
with the `(raw + 1) * 10` rule, or `1800 DPI` if ATK rounds/displays this slot
differently. Capture known fixed values, especially `800`, `900`, `1600` and
`1800`, before wiring writes into the app.

### Polling Rate

Polling rate is stored in the same addr `0x00`, len `0x08` block as the active
DPI stage. Bytes 5/6 are a value/check pair where the check byte follows
`0x55 - value`.

Captured with active DPI stage 4 (`03 52`):

```txt
125 Hz:  07 00 00 00 08 08 4d 04 51 03 52 00 00 00 00 3f
250 Hz:  07 00 00 00 08 04 51 04 51 03 52 00 00 00 00 3f
500 Hz:  07 00 00 00 08 02 53 04 51 03 52 00 00 00 00 3f
1000 Hz: 07 00 00 00 08 01 54 04 51 03 52 00 00 00 00 3f
2000 Hz: 07 00 00 00 08 10 45 04 51 03 52 00 00 00 00 3f
4000 Hz: 07 00 00 00 08 20 35 04 51 03 52 00 00 00 00 3f
8000 Hz: 07 00 00 00 08 40 15 04 51 03 52 00 00 00 00 3f
```

Mapping:

```txt
125 Hz  -> 0x08
250 Hz  -> 0x04
500 Hz  -> 0x02
1000 Hz -> 0x01
2000 Hz -> 0x10
4000 Hz -> 0x20
8000 Hz -> 0x40
```

### DPI LED Mode

Captured from the DPI settings LED controls:

```txt
solid:     07 00 00 4c 08 01 54 80 d5 03 52 01 54 00 00 9e
breathing: 07 00 00 4c 08 02 53 80 d5 03 52 01 54 00 00 9e
off:       07 00 00 4c 08 00 00 80 d5 03 52 00 55 00 00 f3
```

Observed fields:

```txt
byte[3] = 0x4C
byte[4] = 0x08
byte[5] = mode: 0=off, 1=solid, 2=breathing
byte[6] = 0x55 - mode for solid/breathing; off captured as 0x00
byte[7..8] = 80 d5, unchanged
byte[9..10] = 03 52, unchanged in this capture
byte[11] = enable: 0=off, 1=on
byte[12] = 0x55 - enable
```

Additional captures show the same `0x4C` block also carries LED brightness and
speed. This was captured while changing the receiver/DPI LED controls.

```txt
off:       07 00 00 4c 08 00 00 ff 56 05 50 00 55 00 00 f3
solid:     07 00 00 4c 08 01 54 ff 56 05 50 01 54 00 00 9e
breathing: 07 00 00 4c 08 02 53 ff 56 05 50 01 54 00 00 9e

speed slow: 07 00 00 4c 08 02 53 ff 56 01 54 01 54 00 00 9e
speed mid:  07 00 00 4c 08 02 53 ff 56 03 52 01 54 00 00 9e

brightness min: 07 00 00 4c 08 01 54 10 45 03 52 01 54 00 00 9e
brightness mid: 07 00 00 4c 08 01 54 80 d5 03 52 01 54 00 00 9e
brightness max: 07 00 00 4c 08 01 54 ff 56 03 52 01 54 00 00 9e
```

Observed `0x4C` field layout:

```txt
byte[5]    mode: 0=off, 1=solid, 2=breathing
byte[6]    0x55 - mode, except off has also been captured as 0x00
byte[7]    brightness raw: 0x10=min, 0x80=middle, 0xff=max
byte[8]    0x55 - brightness
byte[9]    speed raw: 0x01=slow, 0x03=middle
byte[10]   0x55 - speed
byte[11]   enable: 0=off, 1=on
byte[12]   0x55 - enable
```

### Debounce

Debounce is stored in the `0xA9` block. Bytes 5/6 are the debounce value and
its check byte (`0x55 - value`).

```txt
0 ms:  07 00 00 a9 0a 00 55 00 55 05 50 00 55 00 55 ea
1 ms:  07 00 00 a9 0a 01 54 00 55 05 50 00 55 00 55 ea
2 ms:  07 00 00 a9 0a 02 53 00 55 05 50 00 55 00 55 ea
4 ms:  07 00 00 a9 0a 04 51 00 55 05 50 00 55 00 55 ea
8 ms:  07 00 00 a9 0a 08 4d 00 55 05 50 00 55 00 55 ea
15 ms: 07 00 00 a9 0a 0f 46 00 55 05 50 00 55 00 55 ea
20 ms: 07 00 00 a9 0a 14 41 00 55 05 50 00 55 00 55 ea
```

### Sleep Timer

The sleep timer is also stored in the `0xA9` block. Bytes 9/10 are the raw timer
value and its check byte (`0x55 - value`). The raw value is `seconds / 10`.

```txt
30 s:  07 00 00 a9 0a 08 4d 00 55 03 52 00 55 00 55 ea
1 min: 07 00 00 a9 0a 08 4d 00 55 06 4f 00 55 00 55 ea
2 min: 07 00 00 a9 0a 08 4d 00 55 0c 49 00 55 00 55 ea
3 min: 07 00 00 a9 0a 08 4d 00 55 12 43 00 55 00 55 ea
5 min: 07 00 00 a9 0a 08 4d 00 55 1e 37 00 55 00 55 ea
20 min: 07 00 00 a9 0a 08 4d 00 55 78 dd 00 55 00 55 ea
25 min: 07 00 00 a9 0a 08 4d 00 55 96 bf 00 55 00 55 ea
30 min: 07 00 00 a9 0a 08 4d 00 55 b4 a1 00 55 00 55 ea
```

### B5 Timer Mirror / Apply Block

Changing the sleep timer also emitted a second `0xB5` write with the same timer
raw value in bytes 7/8. The first pair remained `01 54` in these captures.

```txt
30 s:  07 00 00 b5 06 01 54 03 52 00 55 00 00 00 00 8c
1 min: 07 00 00 b5 06 01 54 06 4f 00 55 00 00 00 00 8c
2 min: 07 00 00 b5 06 01 54 0c 49 00 55 00 00 00 00 8c
3 min: 07 00 00 b5 06 01 54 12 43 00 55 00 00 00 00 8c
5 min: 07 00 00 b5 06 01 54 1e 37 00 55 00 00 00 00 8c
20 min: 07 00 00 b5 06 01 54 78 dd 00 55 00 00 00 00 8c
25 min: 07 00 00 b5 06 01 54 96 bf 00 55 00 00 00 00 8c
30 min: 07 00 00 b5 06 01 54 b4 a1 00 55 00 00 00 00 8c
```

Do not implement this as a standalone command yet. Treat it as part of the
sleep-timer write sequence until a cleaner capture proves otherwise.

### Lift-Off Distance

Captured from decrease/increase controls. This is command/address `0x0A` with
payload length `0x02`. Byte 5 is the raw value and byte 6 follows
`0x55 - value`.

```txt
07 00 00 0a 02 01 54 00 00 00 00 00 00 00 00 e5
07 00 00 0a 02 02 53 00 00 00 00 00 00 00 00 e5
07 00 00 0a 02 03 52 00 00 00 00 00 00 00 00 e5
07 00 00 0a 02 04 51 00 00 00 00 00 00 00 00 e5
07 00 00 0a 02 05 50 00 00 00 00 00 00 00 00 e5
07 00 00 0a 02 06 4f 00 00 00 00 00 00 00 00 e5
07 00 00 0a 02 07 4e 00 00 00 00 00 00 00 00 e5
07 00 00 0a 02 08 4d 00 00 00 00 00 00 00 00 e5
07 00 00 0a 02 09 4c 00 00 00 00 00 00 00 00 e5
07 00 00 0a 02 0a 4b 00 00 00 00 00 00 00 00 e5
07 00 00 0a 02 0b 4a 00 00 00 00 00 00 00 00 e5
```

This differs from IPI's 0.7/1/2 mm mapping. If this was captured from the ATK
LOD control, the visible control likely maps to raw values `1..11`. The exact
ATK UI label/unit still needs confirmation before implementing.

### A9 Toggle Fields

```txt
byte[7..8]   Motion Sync:       00 55 <-> 01 54
byte[11..12] Linear Correction:  00 55 <-> 01 54
byte[13..14] Ripple Correction:  00 55 <-> 01 54
```

Examples:

```txt
Motion Sync on:      07 00 00 a9 0a 08 4d 01 54 03 52 00 55 00 55 ea
Motion Sync off:     07 00 00 a9 0a 08 4d 00 55 03 52 00 55 00 55 ea
Linear on:           07 00 00 a9 0a 08 4d 00 55 03 52 01 54 00 55 ea
Linear off:          07 00 00 a9 0a 08 4d 00 55 03 52 00 55 00 55 ea
Ripple on:           07 00 00 a9 0a 08 4d 00 55 03 52 00 55 01 54 ea
Ripple off:          07 00 00 a9 0a 08 4d 00 55 03 52 00 55 00 55 ea
```

The baseline in these captures was debounce `8 ms` and sleep timer `30 s`.

### Long-Distance Mode

This matches the block-write style already seen on IPI:

```txt
on:  16 00 00 00 0a 01 00 00 00 00 00 00 00 00 00 2c
off: 16 00 00 00 0a 00 00 00 00 00 00 00 00 00 00 2d
```

The ATK UI labels this as Ultra Distance Mode in this capture.

### RGB / Underglow Mode

Captured from the lighting mode selector:

```txt
off:                    18 00 00 00 0a 00 ff 00 08 05 09 01 00 00 00 15
color stream:           18 00 00 00 0a 01 ff 00 08 05 09 01 00 00 00 14
single-color breathing: 18 00 00 00 0a 02 ff 00 08 05 09 01 00 00 00 13
single-color solid:     18 00 00 00 0a 03 ff 00 08 05 09 01 00 00 00 12
neon:                   18 00 00 00 0a 04 ff 00 08 05 09 01 00 00 00 11
mixed-color breathing:  18 00 00 00 0a 05 ff 00 08 05 09 01 00 00 00 10
colorful solid:         18 00 00 00 0a 06 ff 00 08 05 09 01 00 00 00 0f
```

Only byte 5 changed in this capture. Other bytes likely encode color,
brightness and speed.

Captured brightness, speed and timer fields for single-color breathing
(`mode = 0x02`):

```txt
brightness min: 18 00 00 00 0a 02 ff 00 08 05 00 01 00 00 00 1c
brightness mid: 18 00 00 00 0a 02 ff 00 08 05 05 01 00 00 00 17
brightness max: 18 00 00 00 0a 02 ff 00 08 05 09 01 00 00 00 13

speed slowest: 18 00 00 00 0a 02 ff 00 08 00 09 01 00 00 00 18
speed mid:     18 00 00 00 0a 02 ff 00 08 05 09 01 00 00 00 13
speed max:     18 00 00 00 0a 02 ff 00 08 09 09 01 00 00 00 0f

timer 1 min:   18 00 00 00 0a 02 ff 00 08 09 09 01 00 00 00 0f
timer 5 min:   18 00 00 00 0a 02 ff 00 08 09 09 05 00 00 00 0b
timer 10 min:  18 00 00 00 0a 02 ff 00 08 09 09 0a 00 00 00 06
```

Observed field layout:

```txt
byte[5]  mode
byte[6]  red
byte[7]  green
byte[8]  blue
byte[9]  speed, range 0x00..0x09
byte[10] brightness, range 0x00..0x09
byte[11] timer in minutes
```

Captured color picker examples:

```txt
18 00 00 00 0a 02 12 ff 05 05 09 01 00 00 00 04
18 00 00 00 0a 02 ff 00 0d 05 09 01 00 00 00 0e
```

This indicates direct RGB bytes:

```txt
byte[6..8] = red, green, blue
```

### DPI Preset / Receiver LED Color Table

Captured while changing the receiver LED color from red to green and back to
red. ATK V HUB wrote a color table at addresses `0x2C`, `0x34`, `0x3C` and
`0x44`. Each 8-byte block carries two RGB color groups.

Group format:

```txt
[red, green, blue, check]
check = (0x255 - red - green - blue) & 0xFF
```

Examples:

```txt
red:     ff 00 00 56
green:   00 ff 00 56
blue:    00 00 ff 56
magenta: ff 00 ff 57
```

Observed block writes:

```txt
07 00 00 2c 08 ff 00 00 56 00 ff 00 56 00 00 68
07 00 00 34 08 00 00 ff 56 04 00 ff 52 00 00 60
07 00 00 3c 08 ff 00 ff 57 ff 00 ff 57 00 00 58
07 00 00 44 08 ff 00 ff 57 ff 00 ff 57 00 00 50

07 00 00 34 08 00 00 ff 56 59 ff 00 fd 00 00 60
07 00 00 34 08 00 00 ff 56 ff 59 00 fd 00 00 60
```

This strongly suggests a palette/preset table with two color slots per address:

```txt
0x2C -> color slots 1 and 2
0x34 -> color slots 3 and 4
0x3C -> color slots 5 and 6
0x44 -> color slots 7 and 8
```

The exact UI mapping still needs clean one-slot captures because the color picker
emitted several intermediate colors while dragging.

## Initial Observations

- ATK and IPI share enough framing that the current Rust checksum helpers can be reused.
- Do not send IPI write commands to ATK yet. The frame shape is similar, but memory addresses and some command meanings may differ.
- Battery parsing likely differs from IPI. ATK battery response byte 5 currently matches the UI percentage: `0x5f` = 95%.
- Read responses suggest paired value/checksum fields, for example `20 35`, `04 51`, `01 54`, `00 55`, where the second byte follows `0x55 - value`.

## Remaining Captures Needed

For each capture: click `Clear`, change exactly one setting, then use `Copy hex`.

1. DPI value: set stage 1 to known fixed values, especially `800`, `900`, `1600` and `1800`, to remove the remaining raw-value ambiguity.
2. Confirm the exact UI label/unit for the `0x0A` numeric setting, likely LOD.
3. DPI preset / receiver LED color slots: capture one slot at a time with a single click, not a drag, to map slot order exactly.
4. Firmware/version reads: identify which startup responses map to mouse and dongle firmware versions.
5. Button remapping: capture one simple remap, for example side button -> DPI cycle.
