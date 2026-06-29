use crate::device::with_device;
use crate::protocol::{self, DpiLedMode, Lod, PollingRate};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct StatusInfo {
    pub connected: bool,
    pub battery_percent: u8,
    pub raw_status: String,
    pub raw_battery: String,
    pub last_error: String,
}

#[derive(Serialize, Deserialize)]
pub struct DeviceSettings {
    pub polling_rate: PollingRate,
    pub lod: Lod,
    pub dpi_values: [u16; 4],
    pub active_dpi_stage: u8,
    pub motion_sync: bool,
    pub linear_correction: bool,
    pub waveform_control: bool,
    pub sleep: u8,
    pub full_power: u8,   // 0xB5: rage-mode toggle
    pub work_mode: u8,    // 0xB9: 0=low, 1=high, 2=ultra(unverified)
    pub rage_time: u8,    // 0xB7: full-power duration in seconds
}

#[tauri::command]
pub fn cmd_read_settings() -> Result<DeviceSettings, String> {
    with_device(|dev| {
        let b00  = dev.exchange(&protocol::cmd_block_read(0x00))?;
        let b0a  = dev.exchange(&protocol::cmd_block_read(0x0A))?;
        let b14  = dev.exchange(&protocol::cmd_block_read(0x14))?;
        let baa  = dev.exchange(&protocol::cmd_block_read(0xAA))?;
        let bb4  = dev.exchange(&protocol::cmd_block_read(0xB4))?;
        let stage_frame = dev.exchange(&protocol::cmd_read_dpi_stage())?;

        // Each block response: bytes[5..15] are the 10 data bytes at [addr..addr+9]
        let polling_raw = b00[5];
        let lod_raw     = b0a[5]; // addr 0x0A = b0a offset 0

        // DPI values: (val, val) pairs; (val+1)*50 = DPI
        // Stage 1 at addr 0x0C = b0a offset 2, Stage 2 at 0x10 = offset 6
        let dpi1 = (b0a[7]  as u16 + 1) * 50;
        let dpi2 = (b0a[11] as u16 + 1) * 50;
        // Stage 3 at addr 0x14 = b14 offset 0, Stage 4 at 0x18 = offset 4
        let dpi3 = (b14[5] as u16 + 1) * 50;
        let dpi4 = (b14[9] as u16 + 1) * 50;

        // Block 0xAA: motion_sync@0xAB=off+1, rage_time@0xAD=off+3,
        //             linear@0xAF=off+5, waveform@0xB1=off+7
        let motion_sync       = baa[6]  != 0; // offset 1  (0xAB)
        let sleep             = baa[8];        // offset 3  (0xAD) — confirmed by capture
        let linear_correction = baa[10] != 0; // offset 5  (0xAF)
        let waveform_control  = baa[12] != 0; // offset 7  (0xB1)

        // Block 0xB4: full_power@0xB5, rage_time@0xB7, work_mode@0xB9
        let full_power = bb4[6];  // offset 1  (0xB5)
        let rage_time  = bb4[8];  // offset 3  (0xB7)
        let work_mode  = bb4[10]; // offset 5  (0xB9): 0=low, 1=high

        // addr 0x04 in block 0x00 = currentDpi index (0-based), matches web driver dpiGear
        let active_stage = b00[9].min(3); // b00[5+4] = addr 0x04

        let polling_rate = parse_polling_rate(polling_raw)
            .ok_or_else(|| format!("unknown polling rate byte 0x{polling_raw:02x}"))?;
        let lod = parse_lod(lod_raw)
            .ok_or_else(|| format!("unknown LOD byte 0x{lod_raw:02x}"))?;

        Ok(DeviceSettings {
            polling_rate,
            lod,
            dpi_values: [dpi1, dpi2, dpi3, dpi4],
            active_dpi_stage: active_stage,
            motion_sync,
            linear_correction,
            waveform_control,
            sleep,
            full_power,
            work_mode,
            rage_time,
        })
    })
}

fn parse_polling_rate(val: u8) -> Option<PollingRate> {
    match val {
        0x08 => Some(PollingRate::Hz125),
        0x04 => Some(PollingRate::Hz250),
        0x02 => Some(PollingRate::Hz500),
        0x01 => Some(PollingRate::Hz1000),
        0x10 => Some(PollingRate::Hz2000),
        0x20 => Some(PollingRate::Hz4000),
        0x40 => Some(PollingRate::Hz8000),
        _    => None,
    }
}

fn parse_lod(val: u8) -> Option<Lod> {
    match val {
        0x03 => Some(Lod::Mm07),
        0x01 => Some(Lod::Mm1),
        0x02 => Some(Lod::Mm2),
        _    => None,
    }
}

#[tauri::command]
pub fn cmd_status() -> StatusInfo {
    let status_frame = protocol::cmd_status();
    let battery_frame = protocol::cmd_battery();

    let (raw_status, raw_battery, connected, battery_percent, last_error) =
        match with_device(|dev| {
            let s = dev.exchange(&status_frame)?;
            let b = dev.exchange(&battery_frame)?;
            Ok((s, b))
        }) {
            Ok((s, b)) => {
                let pct = parse_battery_percent(&b).or_else(|| parse_status_battery_percent(&s)).unwrap_or(0);
                (
                    hex_str(&s),
                    hex_str(&b),
                    true,
                    pct,
                    String::new(),
                )
            }
            Err(err) => {
                eprintln!("cmd_status failed: {err}");
                // clear cached device so next call re-opens
                if let Ok(mut g) = crate::device::DEVICE.lock() {
                    *g = None;
                }
                (String::new(), String::new(), false, 0, err)
            }
        };

    StatusInfo { connected, battery_percent, raw_status, raw_battery, last_error }
}

#[tauri::command]
pub fn cmd_set_dpi_stage(stage: u8) -> Result<(), String> {
    let frame = protocol::cmd_select_stage(stage);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_dpi_value(stage: u8, dpi: u16) -> Result<(), String> {
    let frame = protocol::cmd_set_dpi(stage, dpi);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_dpi_led_mode(mode: DpiLedMode) -> Result<(), String> {
    if !protocol::is_verified_dpi_led_mode(mode) {
        return Err(format!("DPI LED mode {mode:?} is not verified and will not be sent"));
    }

    let apply = protocol::cmd_dpi_led_apply(mode);
    with_device(|dev| {
        if let Some(frame) = protocol::cmd_dpi_led_mode(mode) {
            dev.write(&frame)?;
        }
        dev.write(&apply)
    })
}

#[tauri::command]
pub fn cmd_set_polling_rate(rate: PollingRate) -> Result<(), String> {
    if !protocol::is_verified_polling_rate(rate) {
        return Err(format!("polling rate {rate:?} is not verified and will not be sent"));
    }

    let frame = protocol::cmd_polling_rate(rate);
    let apply_frame = protocol::cmd_polling_rate_apply(rate);
    with_device(|dev| {
        dev.write(&frame)?;
        dev.write(&apply_frame)
    })
}

#[tauri::command]
pub fn cmd_set_lod(lod: Lod) -> Result<(), String> {
    if !protocol::is_verified_lod(lod) {
        return Err(format!("LOD {lod:?} is not verified and will not be sent"));
    }

    let frame = protocol::cmd_lod(lod);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_dpi_led_brightness(brightness: u8) -> Result<(), String> {
    let raw = protocol::brightness_to_raw(brightness);
    let frame = protocol::cmd_dpi_led_brightness(raw);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_breathing_speed(speed: u8) -> Result<(), String> {
    let frame = protocol::cmd_breathing_speed(speed);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_linear_correction(enabled: bool) -> Result<(), String> {
    let frame = protocol::cmd_linear_correction(enabled);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_waveform_control(enabled: bool) -> Result<(), String> {
    let frame = protocol::cmd_waveform_control(enabled);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_motion_sync(enabled: bool) -> Result<(), String> {
    let frame = protocol::cmd_motion_sync(enabled);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_sleep(sleep: u8) -> Result<(), String> {
    let frame = protocol::cmd_sleep(sleep);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_work_mode(mode: u8) -> Result<(), String> {
    let frame = protocol::cmd_work_mode(mode);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_debounce(ms: u8) -> Result<(), String> {
    let frame = protocol::cmd_debounce(ms);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_working_mode(mode: u8) -> Result<(), String> {
    let frame = protocol::cmd_working_mode(mode);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_rage_time(seconds: u8) -> Result<(), String> {
    let frame = protocol::cmd_rage_time(seconds);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_long_distance(enabled: bool) -> Result<(), String> {
    let frame = protocol::cmd_long_distance(enabled);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_fps20k(enabled: bool) -> Result<(), String> {
    let frame = protocol::cmd_fps20k(enabled);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_set_receiver_led(mode: u8) -> Result<(), String> {
    let frame = protocol::cmd_receiver_led(mode);
    with_device(|dev| dev.write(&frame))
}

#[derive(Serialize)]
pub struct HidDeviceInfo {
    pub vendor_id: u16,
    pub product_id: u16,
    pub product_string: Option<String>,
    pub manufacturer_string: Option<String>,
}

#[tauri::command]
pub fn cmd_set_angle(enabled: bool, angle: i8) -> Result<(), String> {
    with_device(|dev| {
        if enabled {
            dev.write(&protocol::cmd_angle_enable(true))?;
            dev.write(&protocol::cmd_angle(angle))
        } else {
            dev.write(&protocol::cmd_angle_enable(false))
        }
    })
}

#[tauri::command]
pub fn cmd_list_hid_devices() -> Result<Vec<HidDeviceInfo>, String> {
    use hidapi::HidApi;
    use std::collections::HashSet;
    let api = HidApi::new().map_err(|e| e.to_string())?;
    let mut seen = HashSet::new();
    let devices = api
        .device_list()
        .filter_map(|info| {
            let key = (info.vendor_id(), info.product_id(),
                       info.product_string().map(str::to_owned));
            if seen.insert(key) {
                Some(HidDeviceInfo {
                    vendor_id: info.vendor_id(),
                    product_id: info.product_id(),
                    product_string: info.product_string().map(str::to_owned),
                    manufacturer_string: info.manufacturer_string().map(str::to_owned),
                })
            } else {
                None
            }
        })
        .collect();
    Ok(devices)
}

#[tauri::command]
pub fn cmd_factory_reset() -> Result<(), String> {
    let frame = protocol::cmd_factory_reset();
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_reset_buttons() -> Result<(), String> {
    let frames = protocol::cmd_buttons_restore_defaults();
    with_device(|dev| {
        for frame in &frames {
            dev.write(frame)?;
        }
        Ok(())
    })
}

#[tauri::command]
pub fn cmd_set_button(slot: u8, code: u8) -> Result<(), String> {
    if !protocol::is_valid_button_slot(slot) {
        return Err(format!("unknown button slot 0x{slot:02x}"));
    }
    if !protocol::is_valid_mouse_action(code) {
        return Err(format!("unsupported mouse action code 0x{code:02x}"));
    }
    let frame = protocol::cmd_button(slot, protocol::ACTION_MOUSE, code, 0x00);
    with_device(|dev| dev.write(&frame))
}

#[tauri::command]
pub fn cmd_raw(hex_frame: String) -> Result<String, String> {
    let bytes: Vec<u8> = hex_frame
        .split_whitespace()
        .map(|h| u8::from_str_radix(h, 16).map_err(|e| e.to_string()))
        .collect::<Result<_, _>>()?;
    if bytes.len() != 16 {
        return Err(format!("expected 16 bytes, got {}", bytes.len()));
    }
    let frame: [u8; 16] = bytes.try_into().unwrap();
    let resp = with_device(|dev| dev.exchange(&frame))?;
    Ok(hex_str(&resp))
}

fn hex_str(b: &[u8]) -> String {
    b.iter().map(|x| format!("{:02x}", x)).collect::<Vec<_>>().join(" ")
}

fn parse_battery_percent(frame: &[u8; 16]) -> Option<u8> {
    if frame[0] != 0x04 {
        return None;
    }

    // The 0x04 reply carries the battery voltage in millivolts as a big-endian
    // u16 in bytes [7..=8], e.g. `04 .. 02 19 00 0e e5` -> 0x0EE5 = 3813 mV.
    // The official IPI web driver maps this voltage to a percentage through a
    // Li-Ion discharge curve (3813 mV ~= 42%, 4013 mV ~= 77%), so we mirror that
    // here. byte[5] is a separate raw field that does not match the UI percent.
    let millivolts = u16::from_be_bytes([frame[7], frame[8]]);
    voltage_to_percent(millivolts)
}

/// Maps a Li-Ion cell voltage (mV) to an approximate charge percentage using a
/// piecewise-linear discharge curve anchored on captured (voltage, percent)
/// points from the official IPI web driver.
fn voltage_to_percent(mv: u16) -> Option<u8> {
    // Curve nodes, high -> low. Anchored on real captures: 4013 mV = 77%,
    // 3813 mV = 42%. Remaining nodes follow a typical 1S Li-Ion discharge shape.
    const CURVE: [(u16, u8); 12] = [
        (4200, 100),
        (4100, 90),
        (4013, 77),
        (3900, 58),
        (3850, 50),
        (3813, 42),
        (3750, 30),
        (3700, 22),
        (3650, 15),
        (3600, 10),
        (3500, 4),
        (3400, 0),
    ];

    // A 0 mV reading means the device did not report a voltage yet.
    if mv == 0 {
        return None;
    }
    if mv >= CURVE[0].0 {
        return Some(100);
    }
    if mv <= CURVE[CURVE.len() - 1].0 {
        return Some(0);
    }

    for pair in CURVE.windows(2) {
        let (hi_mv, hi_pct) = pair[0];
        let (lo_mv, lo_pct) = pair[1];
        if mv <= hi_mv && mv >= lo_mv {
            let span = (hi_mv - lo_mv) as u32;
            let pct_span = (hi_pct - lo_pct) as u32;
            let pct = lo_pct as u32 + ((mv - lo_mv) as u32 * pct_span) / span;
            return Some(pct as u8);
        }
    }
    None
}

fn parse_status_battery_percent(frame: &[u8; 16]) -> Option<u8> {
    if frame[0] != 0x03 {
        return None;
    }

    // Status replies carry multiple fields. byte[6] is currently the only
    // percent-looking value observed in status captures; keep it as fallback
    // only because the dedicated 0x04 battery query is more reliable.
    plausible_percent(frame[6])
}

fn plausible_percent(value: u8) -> Option<u8> {
    (2..=100).contains(&value).then_some(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_battery_voltage_reply() {
        // Captured from the IPI web driver at 42% battery: 0x0EE5 = 3813 mV.
        let frame = [0x04, 0x00, 0x00, 0x00, 0x02, 0x19, 0x00, 0x0e, 0xe5, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3b];
        assert_eq!(parse_battery_percent(&frame), Some(42));
    }

    #[test]
    fn battery_voltage_curve_matches_anchor_points() {
        // 4013 mV was reported as 77% by the official driver.
        assert_eq!(voltage_to_percent(4013), Some(77));
        assert_eq!(voltage_to_percent(3813), Some(42));
        assert_eq!(voltage_to_percent(4300), Some(100));
        assert_eq!(voltage_to_percent(3300), Some(0));
    }

    #[test]
    fn rejects_missing_battery_voltage() {
        // A reply with no voltage yet (bytes [7..=8] == 0) is not a valid level.
        let frame = [0x04, 0x00, 0x00, 0x00, 0x02, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x88];
        assert_eq!(parse_battery_percent(&frame), None);
    }

    #[test]
    fn can_fallback_to_status_percent_candidate() {
        let frame = [0x03, 0x00, 0x00, 0x00, 0x01, 0x01, 0x4d, 0x00, 0x3a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xc6];
        assert_eq!(parse_status_battery_percent(&frame), Some(77));
    }
}
