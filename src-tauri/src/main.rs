#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod device;
mod protocol;

use tauri::{
    Manager, PhysicalPosition, SystemTray, SystemTrayEvent, WindowEvent,
};

/// Position the tray flyout window near the tray icon / cursor and show it.
fn show_tray_flyout(app: &tauri::AppHandle, anchor: PhysicalPosition<f64>) {
    if let Some(window) = app.get_window("tray") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
            return;
        }
        let size = window.outer_size().unwrap_or_default();
        let x = (anchor.x as i32) - (size.width as i32) / 2;
        // Show above the taskbar (the click usually lands at the bottom of the screen).
        let y = (anchor.y as i32) - (size.height as i32) - 12;
        let _ = window.set_position(PhysicalPosition::new(x.max(0), y.max(0)));
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Bring the main window forward and hide the tray flyout.
fn show_main(app: &tauri::AppHandle) {
    if let Some(w) = app.get_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
    if let Some(t) = app.get_window("tray") {
        let _ = t.hide();
    }
}

fn main() {
    tauri::Builder::default()
        .system_tray(SystemTray::new())
        .on_system_tray_event(|app, event| match event {
            // Left click / double click brings the app back into focus.
            SystemTrayEvent::LeftClick { .. } | SystemTrayEvent::DoubleClick { .. } => {
                show_main(app);
            }
            // Right click opens the small battery flyout.
            SystemTrayEvent::RightClick { position, .. } => {
                show_tray_flyout(app, position);
            }
            _ => {}
        })
        .on_window_event(|event| match event.event() {
            // Closing the main window only hides it to the tray instead of quitting.
            WindowEvent::CloseRequested { api, .. } => {
                let window = event.window();
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
            // Auto-hide the flyout as soon as it loses focus (click elsewhere).
            WindowEvent::Focused(false) => {
                let window = event.window();
                if window.label() == "tray" {
                    let _ = window.hide();
                }
            }
            _ => {}
        })
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
            commands::cmd_set_angle,
            commands::cmd_list_hid_devices,
            commands::cmd_factory_reset,
            commands::cmd_reset_buttons,
            commands::cmd_set_button,
            commands::cmd_set_button_key,
            commands::cmd_read_buttons,
            commands::cmd_raw,
            commands::cmd_show_main,
            commands::cmd_quit,
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
