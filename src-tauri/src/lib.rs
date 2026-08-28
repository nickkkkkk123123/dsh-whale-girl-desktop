use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State, WindowEvent,
};
use tauri_plugin_autostart::ManagerExt;
use std::sync::Mutex;

struct AppState {
    always_on_top: bool,
}

#[tauri::command]
fn hide_to_tray(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.hide();
    }
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn toggle_always_on_top(app: tauri::AppHandle, state: State<Mutex<AppState>>) -> bool {
    let next = {
        let mut s = state.lock().unwrap();
        s.always_on_top = !s.always_on_top;
        s.always_on_top
    };
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.set_always_on_top(next);
    }
    next
}

#[tauri::command]
fn get_always_on_top(state: State<Mutex<AppState>>) -> bool {
    state.lock().unwrap().always_on_top
}

#[tauri::command]
fn set_auto_launch(app: tauri::AppHandle, enabled: bool) {
    let autostart = app.autolaunch();
    let _ = autostart.disable();
    if enabled {
        let _ = autostart.enable();
    }
}

#[tauri::command]
fn get_auto_launch(app: tauri::AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

/// 将窗口移动到指定屏幕坐标（左上角）。
#[tauri::command]
fn set_window_position(app: tauri::AppHandle, x: i32, y: i32) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.set_position(tauri::LogicalPosition::new(x as f64, y as f64));
    }
}

/// 返回当前显示器工作区尺寸（逻辑像素，与 LogicalPosition 一致）。
#[tauri::command]
fn get_screen_size(app: tauri::AppHandle) -> serde_json::Value {
    // 取所有显示器中工作区面积最大的一个，避免 primary_monitor 在无边框透明窗口下的异常
    let mut best: Option<(u32, u32)> = None;
    let mut best_area: u64 = 0;
    if let Ok(monitors) = app.available_monitors() {
        for m in monitors {
            let wa = m.size();
            let s = wa.to_logical::<f64>(m.scale_factor());
            let w = s.width as u32;
            let h = s.height as u32;
            let area = (w as u64) * (h as u64);
            if area > best_area {
                best_area = area;
                best = Some((w, h));
            }
        }
    }
    let (w, h) = best.unwrap_or((1920, 1080));
    let msg = format!("[get_screen_size] returning w={} h={}\n", w, h);
    let _ = std::fs::write("C:\\Users\\NICK\\.whale-girl-desktop.log", msg);
    serde_json::json!({ "w": w, "h": h })
}

/// 返回系统资源：CPU 使用率(%)、总/可用内存(GB)。
static CPU_SYS: std::sync::Mutex<Option<sysinfo::System>> = std::sync::Mutex::new(None);

#[tauri::command]
fn get_system_stats() -> serde_json::Value {
    use sysinfo::System;
    let mut guard = CPU_SYS.lock().unwrap();
    if guard.is_none() {
        let mut s = System::new();
        s.refresh_cpu_usage();
        std::thread::sleep(std::time::Duration::from_millis(500));
        s.refresh_cpu_usage();
        *guard = Some(s);
    }
    let sys = guard.as_mut().unwrap();
    sys.refresh_cpu_usage();
    std::thread::sleep(std::time::Duration::from_millis(500));
    sys.refresh_cpu_usage();
    // 按逻辑核心求平均，与任务管理器一致（每核 cpu_usage() 返回 0~100）
    let cpus = sys.cpus();
    let n = cpus.len().max(1) as f64;
    let sum: f64 = cpus.iter().map(|c| c.cpu_usage() as f64).sum();
    let cpu_pct = (sum / n).round() as u32;
    sys.refresh_memory();
    let total_mem = sys.total_memory() as f64 / 1024.0 / 1024.0;
    let used_mem = sys.used_memory() as f64 / 1024.0 / 1024.0;
    serde_json::json!({
        "cpu": cpu_pct.min(100),
        "memTotal": (total_mem * 10.0).round() / 10.0,
        "memUsed": (used_mem * 10.0).round() / 10.0,
        "memPct": if total_mem > 0.0 { (used_mem / total_mem * 100.0).round() as u32 } else { 0 },
    })
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "显示", true, None::<&str>)?;
    let top = MenuItem::with_id(app, "toggle-top", "置顶切换", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &top, &quit])?;

    let _tray = TrayIconBuilder::with_id("whale-girl-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "toggle-top" => {
                if let Some(w) = app.get_webview_window("main") {
                    let cur = w.is_always_on_top().unwrap_or(false);
                    let _ = w.set_always_on_top(!cur);
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

fn setup_window(app: &tauri::App) -> tauri::Result<()> {
    if let Some(w) = app.get_webview_window("main") {
        // 初始放在工作区右下角（用 monitor 工作区尺寸，跳过任务栏）
        if let Ok(Some(m)) = app.primary_monitor() {
            let wa = m.work_area().size.to_logical::<f64>(m.scale_factor());
            let wpx = (wa.width as i32) - 320 - 8;
            let hpx = (wa.height as i32) - 560 - 8;
            let _ = w.set_position(tauri::LogicalPosition::new(
                wpx.max(0) as f64,
                hpx.max(0) as f64,
            ));
        }
        let _ = w.set_always_on_top(true);
        let _ = w.set_skip_taskbar(true);
        let _ = w.show();
        let _ = w.set_focus();
    }
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(Mutex::new(AppState { always_on_top: true }))
        .setup(|app| {
            setup_tray(app)?;
            setup_window(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            hide_to_tray,
            quit_app,
            toggle_always_on_top,
            get_always_on_top,
            set_auto_launch,
            get_auto_launch,
            set_window_position,
            get_screen_size,
            get_system_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
