use hidapi::{HidApi, HidDevice};
use std::ffi::CString;

const VID: u16 = 0x3554;
const PID: u16 = 0xF517;
const USAGE_PAGE: u16 = 0xFF02;
const USAGE: u16 = 0x0002;
const REPORT_ID: u8 = 0x08;

#[derive(Clone)]
struct CandidateDevice {
    path: CString,
    usage_page: u16,
    usage: u16,
    interface_number: i32,
    exact_match: bool,
}

fn main() -> Result<(), String> {
    let rate = std::env::args().nth(1).unwrap_or_else(|| "2000".to_string());
    let value = match rate.as_str() {
        "125" => 0x08,
        "250" => 0x04,
        "500" => 0x02,
        "1000" => 0x01,
        "2000" => 0x10,
        "4000" => 0x20,
        "8000" => 0x40,
        _ => return Err("usage: cargo run --example recover_polling -- 125|250|500|1000|2000|4000|8000".to_string()),
    };

    let dev = open_device()?;
    let frame = polling_frame(0x00, value);
    let apply_frame = polling_frame(0xB9, value);
    write_frame(&dev, &frame)?;
    write_frame(&dev, &apply_frame)?;
    println!("sent verified {rate} Hz polling frame and apply frame");
    Ok(())
}

fn polling_frame(encap: u8, value: u8) -> [u8; 16] {
    let mut frame = [0u8; 16];
    frame[3] = encap;
    frame[4] = 0x02;
    frame[5] = value;
    frame[6] = 0x57u8.wrapping_sub(frame[4]).wrapping_sub(frame[5]);
    frame[15] = 0xF1u8.wrapping_sub(frame[3]).wrapping_sub(frame[4]);
    let sum: u16 = frame[2..].iter().map(|&byte| byte as u16).sum();
    frame[0] = ((0x4Du16.wrapping_sub(sum)) & 0xFF) as u8;
    frame
}

fn open_device() -> Result<HidDevice, String> {
    let api = HidApi::new().map_err(|e| e.to_string())?;
    let mut candidates = api
        .device_list()
        .filter(|info| info.vendor_id() == VID && info.product_id() == PID)
        .map(|info| CandidateDevice {
            path: info.path().to_owned(),
            usage_page: info.usage_page(),
            usage: info.usage(),
            interface_number: info.interface_number(),
            exact_match: info.usage_page() == USAGE_PAGE && info.usage() == USAGE,
        })
        .collect::<Vec<_>>();

    if candidates.is_empty() {
        return Err("FLY PRO HID device not found".to_string());
    }

    candidates.sort_by_key(|candidate| (!candidate.exact_match, candidate.interface_number));
    let has_exact_match = candidates.iter().any(|candidate| candidate.exact_match);

    for candidate in candidates {
        if has_exact_match && !candidate.exact_match {
            continue;
        }

        println!(
            "trying usage_page=0x{:04x} usage=0x{:04x} interface={}",
            candidate.usage_page, candidate.usage, candidate.interface_number
        );
        if let Ok(dev) = api.open_path(&candidate.path) {
            return Ok(dev);
        }
    }

    Err("unable to open matching FLY PRO HID interface".to_string())
}

fn write_frame(dev: &HidDevice, frame: &[u8; 16]) -> Result<(), String> {
    let mut buf = vec![REPORT_ID];
    buf.extend_from_slice(frame);

    match dev.write(&buf) {
        Ok(_) => Ok(()),
        Err(write_err) => dev
            .send_output_report(&buf)
            .map_err(|output_err| {
                format!("hid write failed: {write_err}; send_output_report failed: {output_err}")
            }),
    }
}
