use hidapi::{HidApi, HidDevice};
use std::{ffi::CString, sync::Mutex};

const VID: u16 = 0x3554;
const PID: u16 = 0xF517;
const USAGE_PAGE: u16 = 0xFF02;
const USAGE: u16 = 0x0002;
const FRAME_LEN: usize = 16;
const REPORT_ID: u8 = 0x08;
const READ_BUF_LEN: usize = 65;
const READ_TIMEOUT_MS: i32 = 1000;

struct CandidateDevice {
    path: CString,
    usage_page: u16,
    usage: u16,
    interface_number: i32,
    product_string: Option<String>,
    manufacturer_string: Option<String>,
    serial_number: Option<String>,
    exact_match: bool,
}

pub struct Device {
    dev: HidDevice,
}

impl Device {
    pub fn open() -> Result<Self, String> {
        let api = HidApi::new().map_err(|e| e.to_string())?;

        let mut candidates = api
            .device_list()
            .filter(|info| info.vendor_id() == VID && info.product_id() == PID)
            .map(|info| CandidateDevice {
                path: info.path().to_owned(),
                usage_page: info.usage_page(),
                usage: info.usage(),
                interface_number: info.interface_number(),
                product_string: info.product_string().map(str::to_owned),
                manufacturer_string: info.manufacturer_string().map(str::to_owned),
                serial_number: info.serial_number().map(str::to_owned),
                exact_match: info.usage_page() == USAGE_PAGE && info.usage() == USAGE,
            })
            .collect::<Vec<_>>();

        if candidates.is_empty() {
            return Err(format!(
                "FLY PRO not found for VID=0x{VID:04x} PID=0x{PID:04x}. Is the mouse/receiver connected and powered on?"
            ));
        }

        candidates.sort_by_key(|candidate| (!candidate.exact_match, candidate.interface_number));

        eprintln!(
            "FLY PRO HID candidates for VID=0x{VID:04x} PID=0x{PID:04x}:"
        );
        for candidate in &candidates {
            eprintln!("  - {}", describe_candidate(candidate));
        }

        let has_exact_match = candidates.iter().any(|candidate| candidate.exact_match);
        let selected = candidates
            .into_iter()
            .filter(|candidate| !has_exact_match || candidate.exact_match);

        let mut open_errors = Vec::new();
        for candidate in selected {
            match api.open_path(&candidate.path) {
                Ok(dev) => {
                    eprintln!("Opened HID interface: {}", describe_candidate(&candidate));
                    return Ok(Self { dev });
                }
                Err(err) => {
                    open_errors.push(format!("{} -> {}", describe_candidate(&candidate), err));
                }
            }
        }

        Err(format!(
            "Unable to open any matching FLY PRO HID interface.\n{}",
            open_errors.join("\n")
        ))
    }

    pub fn write(&self, frame: &[u8; FRAME_LEN]) -> Result<(), String> {
        let mut buf = vec![REPORT_ID];
        buf.extend_from_slice(frame);

        match self.dev.write(&buf) {
            Ok(_) => Ok(()),
            Err(write_err) => {
                self.dev
                    .send_output_report(&buf)
                    .map_err(|output_err| {
                        format!(
                            "hid write failed: {write_err}; send_output_report fallback failed: {output_err}"
                        )
                    })
            }
        }
    }

    pub fn read(&self) -> Result<[u8; FRAME_LEN], String> {
        let mut buf = [0u8; READ_BUF_LEN];
        let read = self
            .dev
            .read_timeout(&mut buf, READ_TIMEOUT_MS)
            .map_err(|e| format!("hid read failed: {e}"))?;

        if read == 0 {
            return Err(format!("hid read timed out after {READ_TIMEOUT_MS} ms"));
        }

        let payload = if read >= FRAME_LEN + 1 && buf[0] == REPORT_ID {
            &buf[1..=FRAME_LEN]
        } else if read >= FRAME_LEN {
            &buf[..FRAME_LEN]
        } else {
            return Err(format!(
                "unexpected HID response length {read}: {}",
                hex_preview(&buf[..read.min(buf.len())])
            ));
        };

        let mut frame = [0u8; FRAME_LEN];
        frame.copy_from_slice(payload);
        Ok(frame)
    }

    pub fn exchange(&self, frame: &[u8; FRAME_LEN]) -> Result<[u8; FRAME_LEN], String> {
        self.write(frame)?;
        self.read()
    }
}

pub static DEVICE: Mutex<Option<Device>> = Mutex::new(None);

pub fn ensure_connected() -> Result<(), String> {
    let mut guard = DEVICE.lock().map_err(|e| e.to_string())?;
    if guard.is_none() {
        *guard = Some(Device::open()?);
    }
    Ok(())
}

pub fn with_device<F, T>(f: F) -> Result<T, String>
where
    F: FnOnce(&Device) -> Result<T, String>,
{
    ensure_connected()?;
    let guard = DEVICE.lock().map_err(|e| e.to_string())?;
    let dev = guard.as_ref().ok_or("device not available")?;
    f(dev)
}

fn describe_candidate(candidate: &CandidateDevice) -> String {
    let path = candidate.path.to_string_lossy();
    let product = candidate.product_string.as_deref().unwrap_or("<unknown product>");
    let manufacturer = candidate
        .manufacturer_string
        .as_deref()
        .unwrap_or("<unknown manufacturer>");
    let serial = candidate.serial_number.as_deref().unwrap_or("<no serial>");

    format!(
        "usage_page=0x{:04x} usage=0x{:04x} interface={} exact={} product='{}' manufacturer='{}' serial='{}' path='{}'",
        candidate.usage_page,
        candidate.usage,
        candidate.interface_number,
        candidate.exact_match,
        product,
        manufacturer,
        serial,
        path
    )
}

fn hex_preview(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<Vec<_>>()
        .join(" ")
}
