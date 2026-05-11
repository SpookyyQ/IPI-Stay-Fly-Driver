/// IPI FLY PRO – HID frame builder and checksum helpers.
///
/// All frames are 16 bytes. Byte 0 is the global checksum:
///   byte[0] = (0x4D - sum(byte[2..=15])) & 0xFF
/// Byte 6 is the local mini-checksum for most config commands:
///   byte[6] = 0x57 - byte[4] - byte[5]
/// Byte 15 is a tail checksum for config commands:
///   byte[15] = 0xF1 - byte[3] - byte[4]

pub const FRAME_LEN: usize = 16;

pub fn checksum(frame: &mut [u8; FRAME_LEN]) {
    let sum: u16 = frame[2..].iter().map(|&b| b as u16).sum();
    frame[0] = ((0x4Du16.wrapping_sub(sum)) & 0xFF) as u8;
}

pub fn mini_checksum(frame: &mut [u8; FRAME_LEN]) {
    frame[6] = 0x57u8.wrapping_sub(frame[4]).wrapping_sub(frame[5]);
}

pub fn tail_checksum(frame: &mut [u8; FRAME_LEN]) {
    frame[15] = 0xF1u8.wrapping_sub(frame[3]).wrapping_sub(frame[4]);
}

pub fn build(mut f: [u8; FRAME_LEN]) -> [u8; FRAME_LEN] {
    mini_checksum(&mut f);
    tail_checksum(&mut f);
    checksum(&mut f);
    f
}

// ── Commands ────────────────────────────────────────────────────────────────

pub fn cmd_status() -> [u8; FRAME_LEN] {
    [0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4a]
}

pub fn cmd_battery() -> [u8; FRAME_LEN] {
    [0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x49]
}

pub fn cmd_select_stage(stage: u8) -> [u8; FRAME_LEN] {
    // stage 0-3
    let mut f = [0u8; FRAME_LEN];
    f[2] = 0x00;
    f[3] = 0x04;
    f[4] = 0x02;
    f[5] = stage & 0x03;
    build(f)
}

pub fn cmd_set_dpi(stage: u8, dpi: u16) -> [u8; FRAME_LEN] {
    // dpi = 50..=42000, step 50. Byte 5 == byte 6 == (dpi/50)-1.
    // Byte 8 purpose is unverified; 0x77 is the only captured working value so far.
    let _stage = stage;
    let val = ((dpi / 50).saturating_sub(1)) as u8;
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0x18;
    f[4] = 0x04;
    f[5] = val;
    f[6] = val;  // not mini-checksum; both bytes carry the encoded DPI
    f[8] = 0x77;
    tail_checksum(&mut f);
    checksum(&mut f);
    f
}

#[derive(serde::Deserialize, serde::Serialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub enum DpiLedMode {
    #[serde(rename = "Off")]
    Off,
    #[serde(rename = "Solid")]
    Solid,
    #[serde(rename = "Breathing")]
    Breathing,
}

/// Set frame (0x4C) — only sent for Solid and Breathing, not Off.
pub fn cmd_dpi_led_mode(mode: DpiLedMode) -> Option<[u8; FRAME_LEN]> {
    let value = match mode {
        DpiLedMode::Off => return None,
        DpiLedMode::Solid => 0x01,
        DpiLedMode::Breathing => 0x02,
    };
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0x4C;
    f[4] = 0x02;
    f[5] = value;
    Some(build(f))
}

/// Apply frame (0x52) — always sent; 0x01 = LED active (any mode), 0x00 = Off.
pub fn cmd_dpi_led_apply(mode: DpiLedMode) -> [u8; FRAME_LEN] {
    let value = match mode {
        DpiLedMode::Off => 0x00,
        DpiLedMode::Solid | DpiLedMode::Breathing => 0x01,
    };
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0x52;
    f[4] = 0x02;
    f[5] = value;
    build(f)
}

pub fn is_verified_dpi_led_mode(_mode: DpiLedMode) -> bool {
    true
}

/// Brightness for the DPI LED. Slider 0-10 maps to raw 0-255 (n * 255 / 10).
pub fn cmd_dpi_led_brightness(raw: u8) -> [u8; FRAME_LEN] {
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0x4E;
    f[4] = 0x02;
    f[5] = raw;
    build(f)
}

pub fn brightness_to_raw(level: u8) -> u8 {
    ((level.min(10) as u16 * 255) / 10) as u8
}

/// Breathing speed. ENCAP=0x50, raw value 1-5 (verified: 2,3,4,5 from captures).
pub fn cmd_breathing_speed(speed: u8) -> [u8; FRAME_LEN] {
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0x50;
    f[4] = 0x02;
    f[5] = speed.clamp(1, 5);
    build(f)
}

#[derive(serde::Deserialize, serde::Serialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub enum PollingRate {
    #[serde(rename = "Hz125")]
    Hz125,
    #[serde(rename = "Hz250")]
    Hz250,
    #[serde(rename = "Hz500")]
    Hz500,
    #[serde(rename = "Hz1000")]
    Hz1000,
    #[serde(rename = "Hz2000")]
    Hz2000,
    #[serde(rename = "Hz4000")]
    Hz4000,
    #[serde(rename = "Hz8000")]
    Hz8000,
}

pub fn is_verified_polling_rate(rate: PollingRate) -> bool {
    matches!(
        rate,
        PollingRate::Hz125
            | PollingRate::Hz250
            | PollingRate::Hz500
            | PollingRate::Hz1000
            | PollingRate::Hz2000
            | PollingRate::Hz4000
            | PollingRate::Hz8000
    )
}

fn polling_rate_value(rate: PollingRate) -> u8 {
    match rate {
        PollingRate::Hz125  => 0x08,
        PollingRate::Hz250  => 0x04,
        PollingRate::Hz500  => 0x02,
        PollingRate::Hz1000 => 0x01,
        PollingRate::Hz2000 => 0x10,
        PollingRate::Hz4000 => 0x20,
        PollingRate::Hz8000 => 0x40,
    }
}

pub fn cmd_polling_rate(rate: PollingRate) -> [u8; FRAME_LEN] {
    cmd_polling_rate_with_encap(rate, 0x00)
}

pub fn cmd_polling_rate_apply(rate: PollingRate) -> [u8; FRAME_LEN] {
    cmd_polling_rate_with_encap(rate, 0xB9)
}

fn cmd_polling_rate_with_encap(rate: PollingRate, encap: u8) -> [u8; FRAME_LEN] {
    let mut f = [0u8; FRAME_LEN];
    f[3] = encap;
    f[4] = 0x02;
    f[5] = polling_rate_value(rate);
    build(f)
}

#[derive(serde::Deserialize, serde::Serialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Lod {
    #[serde(rename = "Mm07")]
    Mm07,
    #[serde(rename = "Mm1")]
    Mm1,
    #[serde(rename = "Mm2")]
    Mm2,
}

pub fn is_verified_lod(lod: Lod) -> bool {
    matches!(lod, Lod::Mm07 | Lod::Mm1 | Lod::Mm2)
}

pub fn cmd_lod(lod: Lod) -> [u8; FRAME_LEN] {
    let val: u8 = match lod {
        Lod::Mm07 => 0x03,
        Lod::Mm1  => 0x01,
        Lod::Mm2  => 0x02,
    };
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0x0A;
    f[4] = 0x02;
    f[5] = val;
    build(f)
}

pub fn cmd_linear_correction(enabled: bool) -> [u8; FRAME_LEN] {
    // Captured on-frame: 07 00 00 af 02 01 54 00 ... 40.
    // Off is the same toggle shape with byte[5]=0.
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0xAF;
    f[4] = 0x02;
    f[5] = u8::from(enabled);
    build(f)
}

pub fn cmd_waveform_control(enabled: bool) -> [u8; FRAME_LEN] {
    // Captured on-frame: 07 00 00 b1 02 01 54 00 ... 3e.
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0xB1;
    f[4] = 0x02;
    f[5] = u8::from(enabled);
    build(f)
}

pub fn cmd_motion_sync(enabled: bool) -> [u8; FRAME_LEN] {
    // Captured on-frame: 07 00 00 ab 02 01 54 00 ... 44.
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0xAB;
    f[4] = 0x02;
    f[5] = u8::from(enabled);
    build(f)
}

/// Work mode. ENCAP=0xB9. 0=low power, 1=high performance (ultra/2 not yet captured).
pub fn cmd_work_mode(mode: u8) -> [u8; FRAME_LEN] {
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0xB9;
    f[4] = 0x02;
    f[5] = mode;
    build(f)
}

/// Key debounce time in ms. ENCAP=0xA9. Raw value = ms (verified: 0,5,6,7,8,20).
pub fn cmd_debounce(ms: u8) -> [u8; FRAME_LEN] {
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0xA9;
    f[4] = 0x02;
    f[5] = ms;
    build(f)
}

/// Full-power / rage mode toggle. ENCAP=0xB5. 0=off, 1=on.
pub fn cmd_working_mode(mode: u8) -> [u8; FRAME_LEN] {
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0xB5;
    f[4] = 0x02;
    f[5] = mode;
    build(f)
}

/// Rage-time duration. ENCAP=0xB7. Raw seconds value.
/// Verified values: 1, 3, 6, 12, 18, 36, 60, 90.
pub fn cmd_rage_time(seconds: u8) -> [u8; FRAME_LEN] {
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0xB7;
    f[4] = 0x02;
    f[5] = seconds;
    build(f)
}

/// Long-distance mode (block-write style).
/// ON:  16 00 00 00 0a 01 00 00 00 00 00 00 00 00 00 2c
/// OFF: 16 00 00 00 0a 00 00 00 00 00 00 00 00 00 00 2d
pub fn cmd_long_distance(enabled: bool) -> [u8; FRAME_LEN] {
    let v = u8::from(enabled);
    let mut f = [0u8; FRAME_LEN];
    f[3]  = 0x00;
    f[4]  = 0x0A;
    f[5]  = v;
    f[15] = 0x2Du8.wrapping_sub(v);
    checksum(&mut f);
    f
}

/// 20K FPS sensor scan rate. ENCAP=0xE1.
pub fn cmd_fps20k(enabled: bool) -> [u8; FRAME_LEN] {
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0xE1;
    f[4] = 0x02;
    f[5] = u8::from(enabled);
    build(f)
}

/// Sleep timer. ENCAP=0xAD, raw value (verified: 7, 8, 100 from captures).
pub fn cmd_sleep(value: u8) -> [u8; FRAME_LEN] {
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0xAD;
    f[4] = 0x02;
    f[5] = value;
    build(f)
}

// ── Block write ────────────────────────────────────────────────────────────

/// Receiver LED (battery indicator on the USB dongle).
/// mode 1 = Hz indicator, mode 2 = battery level, mode 3 = warning only
/// (all three verified by capture; mode 0/off has no capture).
/// byte[15] = 0x33 - mode  keeps sum(bytes[2..16]) = 0x39 so byte[0] = 0x14.
pub fn cmd_receiver_led(mode: u8) -> [u8; FRAME_LEN] {
    let mut f = [0u8; FRAME_LEN];
    f[3]  = 0x00;
    f[4]  = 0x0A;
    f[5]  = mode;
    f[6]  = 0x00;
    f[7]  = 0xFF;
    f[8]  = 0x00;
    f[9]  = 0xFF;
    f[10] = 0xFF;
    f[11] = 0x00;
    f[12] = 0xFF;
    f[13] = 0x00;
    f[14] = 0x00;
    f[15] = 0x33u8.wrapping_sub(mode);
    checksum(&mut f);
    f
}

// ── Block read ─────────────────────────────────────────────────────────────

/// Build a 10-byte block-read frame for the given start address.
/// The device responds with 10 bytes of config memory starting at `addr`.
pub fn cmd_block_read(addr: u8) -> [u8; FRAME_LEN] {
    let mut f = [0u8; FRAME_LEN];
    f[3] = addr;
    f[4] = 0x0A;
    // tail: 0x3B - addr keeps global checksum at 0x08
    f[15] = 0x3Bu8.wrapping_sub(addr);
    // global checksum: sum(f[2..]) = addr + 0x0A + (0x3B - addr) = 0x45; 0x4D-0x45=0x08
    f[0] = 0x08;
    f
}

/// Angle snapping enable/disable. ENCAP=0xBF. 0=off, 1=on.
pub fn cmd_angle_enable(enabled: bool) -> [u8; FRAME_LEN] {
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0xBF;
    f[4] = 0x02;
    f[5] = u8::from(enabled);
    build(f)
}

/// Angle snapping value. ENCAP=0xBD. Range: -45..=+45.
/// Positive values stored as-is; negative as two's-complement u8 (e.g. -10 → 0xF6).
pub fn cmd_angle(angle: i8) -> [u8; FRAME_LEN] {
    let mut f = [0u8; FRAME_LEN];
    f[3] = 0xBD;
    f[4] = 0x02;
    f[5] = angle as u8;
    build(f)
}

/// Factory reset. Hardcoded frame verified from capture.
pub fn cmd_factory_reset() -> [u8; FRAME_LEN] {
    [0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
     0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x44]
}

/// Scalar read that returns the currently active DPI stage index (0-3).
pub fn cmd_read_dpi_stage() -> [u8; FRAME_LEN] {
    // byte[15] = 0x3B; checksum = 0x4D - 0x3B = 0x12
    let mut f = [0u8; FRAME_LEN];
    f[15] = 0x3B;
    f[0] = 0x12;
    f
}

// ── Unit tests ──────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn hex(s: &str) -> [u8; FRAME_LEN] {
        let bytes: Vec<u8> = s
            .split_whitespace()
            .map(|h| u8::from_str_radix(h, 16).unwrap())
            .collect();
        bytes.try_into().expect("frame must be 16 bytes")
    }

    #[test]
    fn test_select_stage_1() {
        assert_eq!(cmd_select_stage(0), hex("07 00 00 04 02 00 55 00 00 00 00 00 00 00 00 eb"));
    }

    #[test]
    fn test_status_poll() {
        assert_eq!(cmd_status(), hex("03 00 00 00 00 00 00 00 00 00 00 00 00 00 00 4a"));
    }

    #[test]
    fn test_battery_query() {
        assert_eq!(cmd_battery(), hex("04 00 00 00 00 00 00 00 00 00 00 00 00 00 00 49"));
    }

    #[test]
    fn test_select_stage_2() {
        assert_eq!(cmd_select_stage(1), hex("07 00 00 04 02 01 54 00 00 00 00 00 00 00 00 eb"));
    }

    #[test]
    fn test_select_stage_3() {
        assert_eq!(cmd_select_stage(2), hex("07 00 00 04 02 02 53 00 00 00 00 00 00 00 00 eb"));
    }

    #[test]
    fn test_select_stage_4() {
        assert_eq!(cmd_select_stage(3), hex("07 00 00 04 02 03 52 00 00 00 00 00 00 00 00 eb"));
    }

    #[test]
    fn test_polling_250() {
        assert_eq!(cmd_polling_rate(PollingRate::Hz250), hex("07 00 00 00 02 04 51 00 00 00 00 00 00 00 00 ef"));
    }

    #[test]
    fn test_dpi_led_off_apply() {
        assert_eq!(cmd_dpi_led_apply(DpiLedMode::Off), hex("07 00 00 52 02 00 55 00 00 00 00 00 00 00 00 9d"));
    }

    #[test]
    fn test_dpi_led_solid() {
        assert_eq!(cmd_dpi_led_mode(DpiLedMode::Solid), Some(hex("07 00 00 4c 02 01 54 00 00 00 00 00 00 00 00 a3")));
    }

    #[test]
    fn test_dpi_led_solid_apply() {
        assert_eq!(cmd_dpi_led_apply(DpiLedMode::Solid), hex("07 00 00 52 02 01 54 00 00 00 00 00 00 00 00 9d"));
    }

    #[test]
    fn test_dpi_led_breathing() {
        assert_eq!(cmd_dpi_led_mode(DpiLedMode::Breathing), Some(hex("07 00 00 4c 02 02 53 00 00 00 00 00 00 00 00 a3")));
    }

    #[test]
    fn test_dpi_led_breathing_apply() {
        // Apply frame always sends 0x01 (enabled) regardless of Solid vs Breathing
        assert_eq!(cmd_dpi_led_apply(DpiLedMode::Breathing), hex("07 00 00 52 02 01 54 00 00 00 00 00 00 00 00 9d"));
    }

    #[test]
    fn test_dpi_led_off_no_set_frame() {
        assert_eq!(cmd_dpi_led_mode(DpiLedMode::Off), None);
    }

    #[test]
    fn test_polling_125() {
        assert_eq!(cmd_polling_rate(PollingRate::Hz125), hex("07 00 00 00 02 08 4d 00 00 00 00 00 00 00 00 ef"));
    }

    #[test]
    fn test_polling_125_apply() {
        assert_eq!(cmd_polling_rate_apply(PollingRate::Hz125), hex("07 00 00 b9 02 08 4d 00 00 00 00 00 00 00 00 36"));
    }

    #[test]
    fn test_polling_500() {
        assert_eq!(cmd_polling_rate(PollingRate::Hz500), hex("07 00 00 00 02 02 53 00 00 00 00 00 00 00 00 ef"));
    }

    #[test]
    fn test_polling_500_apply() {
        assert_eq!(cmd_polling_rate_apply(PollingRate::Hz500), hex("07 00 00 b9 02 02 53 00 00 00 00 00 00 00 00 36"));
    }

    #[test]
    fn test_polling_1000() {
        assert_eq!(cmd_polling_rate(PollingRate::Hz1000), hex("07 00 00 00 02 01 54 00 00 00 00 00 00 00 00 ef"));
    }

    #[test]
    fn test_polling_1000_apply() {
        assert_eq!(cmd_polling_rate_apply(PollingRate::Hz1000), hex("07 00 00 b9 02 01 54 00 00 00 00 00 00 00 00 36"));
    }

    #[test]
    fn test_polling_2000() {
        assert_eq!(cmd_polling_rate(PollingRate::Hz2000), hex("07 00 00 00 02 10 45 00 00 00 00 00 00 00 00 ef"));
    }

    #[test]
    fn test_polling_2000_apply() {
        assert_eq!(cmd_polling_rate_apply(PollingRate::Hz2000), hex("07 00 00 b9 02 10 45 00 00 00 00 00 00 00 00 36"));
    }

    #[test]
    fn test_polling_4000() {
        assert_eq!(cmd_polling_rate(PollingRate::Hz4000), hex("07 00 00 00 02 20 35 00 00 00 00 00 00 00 00 ef"));
    }

    #[test]
    fn test_polling_4000_apply() {
        assert_eq!(cmd_polling_rate_apply(PollingRate::Hz4000), hex("07 00 00 b9 02 20 35 00 00 00 00 00 00 00 00 36"));
    }

    #[test]
    fn test_polling_8000() {
        assert_eq!(cmd_polling_rate(PollingRate::Hz8000), hex("07 00 00 00 02 40 15 00 00 00 00 00 00 00 00 ef"));
    }

    #[test]
    fn test_lod_07() {
        assert_eq!(cmd_lod(Lod::Mm07), hex("07 00 00 0a 02 03 52 00 00 00 00 00 00 00 00 e5"));
    }

    #[test]
    fn test_lod_1mm() {
        assert_eq!(cmd_lod(Lod::Mm1), hex("07 00 00 0a 02 01 54 00 00 00 00 00 00 00 00 e5"));
    }

    #[test]
    fn test_lod_2mm() {
        assert_eq!(cmd_lod(Lod::Mm2), hex("07 00 00 0a 02 02 53 00 00 00 00 00 00 00 00 e5"));
    }

    #[test]
    fn test_linear_correction_on() {
        assert_eq!(cmd_linear_correction(true), hex("07 00 00 af 02 01 54 00 00 00 00 00 00 00 00 40"));
    }

    #[test]
    fn test_linear_correction_off() {
        assert_eq!(cmd_linear_correction(false), hex("07 00 00 af 02 00 55 00 00 00 00 00 00 00 00 40"));
    }

    #[test]
    fn test_waveform_control_on() {
        assert_eq!(cmd_waveform_control(true), hex("07 00 00 b1 02 01 54 00 00 00 00 00 00 00 00 3e"));
    }

    #[test]
    fn test_waveform_control_off() {
        assert_eq!(cmd_waveform_control(false), hex("07 00 00 b1 02 00 55 00 00 00 00 00 00 00 00 3e"));
    }

    #[test]
    fn test_motion_sync_on() {
        assert_eq!(cmd_motion_sync(true), hex("07 00 00 ab 02 01 54 00 00 00 00 00 00 00 00 44"));
    }

    #[test]
    fn test_motion_sync_off() {
        assert_eq!(cmd_motion_sync(false), hex("07 00 00 ab 02 00 55 00 00 00 00 00 00 00 00 44"));
    }

    #[test]
    fn test_work_mode_low()  { assert_eq!(cmd_work_mode(0), hex("07 00 00 b9 02 00 55 00 00 00 00 00 00 00 00 36")); }
    #[test]
    fn test_work_mode_high() { assert_eq!(cmd_work_mode(1), hex("07 00 00 b9 02 01 54 00 00 00 00 00 00 00 00 36")); }

    #[test]
    fn test_debounce_8ms()  { assert_eq!(cmd_debounce(8),  hex("07 00 00 a9 02 08 4d 00 00 00 00 00 00 00 00 46")); }
    #[test]
    fn test_debounce_20ms() { assert_eq!(cmd_debounce(20), hex("07 00 00 a9 02 14 41 00 00 00 00 00 00 00 00 46")); }
    #[test]
    fn test_debounce_0ms()  { assert_eq!(cmd_debounce(0),  hex("07 00 00 a9 02 00 55 00 00 00 00 00 00 00 00 46")); }

    #[test]
    fn test_working_mode_off() {
        assert_eq!(cmd_working_mode(0), hex("07 00 00 b5 02 00 55 00 00 00 00 00 00 00 00 3a"));
    }

    #[test]
    fn test_working_mode_on() {
        assert_eq!(cmd_working_mode(1), hex("07 00 00 b5 02 01 54 00 00 00 00 00 00 00 00 3a"));
    }

    #[test]
    fn test_rage_time_1s()  { assert_eq!(cmd_rage_time(1),  hex("07 00 00 b7 02 01 54 00 00 00 00 00 00 00 00 38")); }
    #[test]
    fn test_rage_time_3s()  { assert_eq!(cmd_rage_time(3),  hex("07 00 00 b7 02 03 52 00 00 00 00 00 00 00 00 38")); }
    #[test]
    fn test_rage_time_6s()  { assert_eq!(cmd_rage_time(6),  hex("07 00 00 b7 02 06 4f 00 00 00 00 00 00 00 00 38")); }
    #[test]
    fn test_rage_time_12s() { assert_eq!(cmd_rage_time(12), hex("07 00 00 b7 02 0c 49 00 00 00 00 00 00 00 00 38")); }
    #[test]
    fn test_rage_time_18s() { assert_eq!(cmd_rage_time(18), hex("07 00 00 b7 02 12 43 00 00 00 00 00 00 00 00 38")); }
    #[test]
    fn test_rage_time_36s() { assert_eq!(cmd_rage_time(36), hex("07 00 00 b7 02 24 31 00 00 00 00 00 00 00 00 38")); }
    #[test]
    fn test_rage_time_60s() { assert_eq!(cmd_rage_time(60), hex("07 00 00 b7 02 3c 19 00 00 00 00 00 00 00 00 38")); }
    #[test]
    fn test_rage_time_90s() { assert_eq!(cmd_rage_time(90), hex("07 00 00 b7 02 5a fb 00 00 00 00 00 00 00 00 38")); }

    #[test]
    fn test_long_distance_on() {
        assert_eq!(cmd_long_distance(true),  hex("16 00 00 00 0a 01 00 00 00 00 00 00 00 00 00 2c"));
    }

    #[test]
    fn test_long_distance_off() {
        assert_eq!(cmd_long_distance(false), hex("16 00 00 00 0a 00 00 00 00 00 00 00 00 00 00 2d"));
    }

    #[test]
    fn test_fps20k_on() {
        assert_eq!(cmd_fps20k(true),  hex("07 00 00 e1 02 01 54 00 00 00 00 00 00 00 00 0e"));
    }

    #[test]
    fn test_fps20k_off() {
        assert_eq!(cmd_fps20k(false), hex("07 00 00 e1 02 00 55 00 00 00 00 00 00 00 00 0e"));
    }

    #[test]
    fn test_receiver_led_hz() {
        assert_eq!(cmd_receiver_led(1), hex("14 00 00 00 0a 01 00 ff 00 ff ff 00 ff 00 00 32"));
    }

    #[test]
    fn test_receiver_led_battery() {
        assert_eq!(cmd_receiver_led(2), hex("14 00 00 00 0a 02 00 ff 00 ff ff 00 ff 00 00 31"));
    }

    #[test]
    fn test_receiver_led_warning_only() {
        assert_eq!(cmd_receiver_led(3), hex("14 00 00 00 0a 03 00 ff 00 ff ff 00 ff 00 00 30"));
    }

    #[test]
    fn test_block_read_addr_00() {
        assert_eq!(cmd_block_read(0x00), hex("08 00 00 00 0a 00 00 00 00 00 00 00 00 00 00 3b"));
    }

    #[test]
    fn test_block_read_addr_0a() {
        assert_eq!(cmd_block_read(0x0A), hex("08 00 00 0a 0a 00 00 00 00 00 00 00 00 00 00 31"));
    }

    #[test]
    fn test_block_read_addr_14() {
        assert_eq!(cmd_block_read(0x14), hex("08 00 00 14 0a 00 00 00 00 00 00 00 00 00 00 27"));
    }

    #[test]
    fn test_block_read_addr_aa() {
        assert_eq!(cmd_block_read(0xAA), hex("08 00 00 aa 0a 00 00 00 00 00 00 00 00 00 00 91"));
    }

    #[test]
    fn test_read_dpi_stage() {
        assert_eq!(cmd_read_dpi_stage(), hex("12 00 00 00 00 00 00 00 00 00 00 00 00 00 00 3b"));
    }

    #[test]
    fn test_set_dpi_5600_stage4() {
        assert_eq!(cmd_set_dpi(3, 5600), hex("07 00 00 18 04 6f 6f 00 77 00 00 00 00 00 00 d5"));
    }
}
