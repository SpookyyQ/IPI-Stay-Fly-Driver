// HID Keyboard/Keypad usage IDs (usage page 0x07). Single keys only — these are
// the values written into the mouse's keyboard-macro buffer and button slot.
// See protocol::cmd_button_keyboard on the Rust side.

export interface KeyDef {
  code: number
  label: string
}

export interface KeyGroup {
  group: string
  keys: KeyDef[]
}

const letters: KeyDef[] = Array.from({ length: 26 }, (_, i) => ({
  code: 0x04 + i,
  label: String.fromCharCode(65 + i), // A..Z
}))

const numbers: KeyDef[] = [
  { code: 0x1e, label: '1' },
  { code: 0x1f, label: '2' },
  { code: 0x20, label: '3' },
  { code: 0x21, label: '4' },
  { code: 0x22, label: '5' },
  { code: 0x23, label: '6' },
  { code: 0x24, label: '7' },
  { code: 0x25, label: '8' },
  { code: 0x26, label: '9' },
  { code: 0x27, label: '0' },
]

const functionKeys: KeyDef[] = Array.from({ length: 12 }, (_, i) => ({
  code: 0x3a + i,
  label: `F${i + 1}`,
}))

const controls: KeyDef[] = [
  { code: 0x28, label: 'Enter' },
  { code: 0x29, label: 'Esc' },
  { code: 0x2a, label: 'Backspace' },
  { code: 0x2b, label: 'Tab' },
  { code: 0x2c, label: 'Space' },
  { code: 0x39, label: 'Caps Lock' },
]

const navigation: KeyDef[] = [
  { code: 0x49, label: 'Insert' },
  { code: 0x4a, label: 'Home' },
  { code: 0x4b, label: 'Page Up' },
  { code: 0x4c, label: 'Delete' },
  { code: 0x4d, label: 'End' },
  { code: 0x4e, label: 'Page Down' },
  { code: 0x52, label: 'Arrow Up' },
  { code: 0x51, label: 'Arrow Down' },
  { code: 0x50, label: 'Arrow Left' },
  { code: 0x4f, label: 'Arrow Right' },
]

const symbols: KeyDef[] = [
  { code: 0x2d, label: '- _' },
  { code: 0x2e, label: '= +' },
  { code: 0x2f, label: '[ {' },
  { code: 0x30, label: '] }' },
  { code: 0x31, label: '\\ |' },
  { code: 0x33, label: '; :' },
  { code: 0x34, label: "' \"" },
  { code: 0x35, label: '` ~' },
  { code: 0x36, label: ', <' },
  { code: 0x37, label: '. >' },
  { code: 0x38, label: '/ ?' },
]

const keypad: KeyDef[] = [
  { code: 0x53, label: 'Num Lock' },
  { code: 0x54, label: 'Numpad /' },
  { code: 0x55, label: 'Numpad *' },
  { code: 0x56, label: 'Numpad -' },
  { code: 0x57, label: 'Numpad +' },
  { code: 0x58, label: 'Numpad Enter' },
  { code: 0x59, label: 'Numpad 1' },
  { code: 0x5a, label: 'Numpad 2' },
  { code: 0x5b, label: 'Numpad 3' },
  { code: 0x5c, label: 'Numpad 4' },
  { code: 0x5d, label: 'Numpad 5' },
  { code: 0x5e, label: 'Numpad 6' },
  { code: 0x5f, label: 'Numpad 7' },
  { code: 0x60, label: 'Numpad 8' },
  { code: 0x61, label: 'Numpad 9' },
  { code: 0x62, label: 'Numpad 0' },
  { code: 0x63, label: 'Numpad .' },
]

export const KEY_GROUPS: KeyGroup[] = [
  { group: 'Letters', keys: letters },
  { group: 'Numbers', keys: numbers },
  { group: 'Function', keys: functionKeys },
  { group: 'Controls', keys: controls },
  { group: 'Navigation', keys: navigation },
  { group: 'Symbols', keys: symbols },
  { group: 'Numpad', keys: keypad },
]

const labelByCode = new Map<number, string>(
  KEY_GROUPS.flatMap(g => g.keys).map(k => [k.code, k.label]),
)

export function keyLabel(code: number): string {
  return labelByCode.get(code) ?? `0x${code.toString(16)}`
}
