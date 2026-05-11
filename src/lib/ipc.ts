import { invoke } from '@tauri-apps/api/tauri'

export interface DeviceSettings {
  polling_rate: PollingRate
  lod: Lod
  dpi_values: [number, number, number, number]
  active_dpi_stage: number
  motion_sync: boolean
  linear_correction: boolean
  waveform_control: boolean
  sleep: number
  full_power: number
  work_mode: number
  rage_time: number
}

export interface HidDeviceInfo {
  vendor_id: number
  product_id: number
  product_string: string | null
  manufacturer_string: string | null
}

export interface StatusInfo {
  connected: boolean
  battery_percent: number
  raw_status: string
  raw_battery: string
  last_error: string
}

export type PollingRate = 'Hz125' | 'Hz250' | 'Hz500' | 'Hz1000' | 'Hz2000' | 'Hz4000' | 'Hz8000'
export type Lod = 'Mm07' | 'Mm1' | 'Mm2'
export type DpiLedMode = 'Off' | 'Solid' | 'Breathing'

export const ipc = {
  getStatus: () => invoke<StatusInfo>('cmd_status'),
  setDpiStage: (stage: number) => invoke<void>('cmd_set_dpi_stage', { stage }),
  setDpiValue: (stage: number, dpi: number) => invoke<void>('cmd_set_dpi_value', { stage, dpi }),
  setDpiLedMode: (mode: DpiLedMode) => invoke<void>('cmd_set_dpi_led_mode', { mode }),
  setDpiLedBrightness: (brightness: number) => invoke<void>('cmd_set_dpi_led_brightness', { brightness }),
  setBreathingSpeed: (speed: number) => invoke<void>('cmd_set_breathing_speed', { speed }),
  setSleep: (sleep: number) => invoke<void>('cmd_set_sleep', { sleep }),
  setWorkMode: (mode: number) => invoke<void>('cmd_set_work_mode', { mode }),
  setDebounce: (ms: number) => invoke<void>('cmd_set_debounce', { ms }),
  setWorkingMode: (mode: number) => invoke<void>('cmd_set_working_mode', { mode }),
  setRageTime: (seconds: number) => invoke<void>('cmd_set_rage_time', { seconds }),
  setLongDistance: (enabled: boolean) => invoke<void>('cmd_set_long_distance', { enabled }),
  setFps20k: (enabled: boolean) => invoke<void>('cmd_set_fps20k', { enabled }),
  setReceiverLed: (mode: number) => invoke<void>('cmd_set_receiver_led', { mode }),
  setPollingRate: (rate: PollingRate) => invoke<void>('cmd_set_polling_rate', { rate }),
  setLod: (lod: Lod) => invoke<void>('cmd_set_lod', { lod }),
  setLinearCorrection: (enabled: boolean) => invoke<void>('cmd_set_linear_correction', { enabled }),
  setWaveformControl: (enabled: boolean) => invoke<void>('cmd_set_waveform_control', { enabled }),
  setMotionSync: (enabled: boolean) => invoke<void>('cmd_set_motion_sync', { enabled }),
  listHidDevices: () => invoke<HidDeviceInfo[]>('cmd_list_hid_devices'),
  factoryReset: () => invoke<void>('cmd_factory_reset'),
  readSettings: () => invoke<DeviceSettings>('cmd_read_settings'),
  sendRaw: (hexFrame: string) => invoke<string>('cmd_raw', { hexFrame }),
}
