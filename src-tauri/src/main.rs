#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod device;
mod protocol;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::cmd_status,
            commands::cmd_set_dpi_stage,
            commands::cmd_set_dpi_value,
            commands::cmd_set_dpi_led_mode,
            commands::cmd_set_polling_rate,
            commands::cmd_set_lod,
            commands::cmd_set_linear_correction,
            commands::cmd_set_waveform_control,
            commands::cmd_set_motion_sync,
            commands::cmd_set_dpi_led_brightness,
            commands::cmd_set_breathing_speed,
            commands::cmd_set_sleep,
            commands::cmd_set_work_mode,
            commands::cmd_set_debounce,
            commands::cmd_set_working_mode,
            commands::cmd_set_rage_time,
            commands::cmd_set_long_distance,
            commands::cmd_set_fps20k,
            commands::cmd_set_receiver_led,
            commands::cmd_read_settings,
            commands::cmd_list_hid_devices,
            commands::cmd_factory_reset,
            commands::cmd_raw,
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
