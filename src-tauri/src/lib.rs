use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      #[cfg(target_os = "linux")]
      {
        let win = app.get_webview_window("main").unwrap();
        win.with_webview(|webview| {
          use webkit2gtk::WebViewExt;
          use webkit2gtk::SettingsExt;
          use webkit2gtk::glib::Cast;
          use gtk::prelude::WidgetExt;
          use gtk::prelude::GtkWindowExt;

          // Hardware acceleration
          let settings: webkit2gtk::Settings = WebViewExt::settings(&webview.inner()).unwrap();
          settings.set_hardware_acceleration_policy(
            webkit2gtk::HardwareAccelerationPolicy::Always,
          );

          // Remove CSD — let the WM handle decorations
          if let Some(toplevel) = webview.inner().toplevel() {
            if let Ok(window) = toplevel.downcast::<gtk::ApplicationWindow>() {
              window.set_titlebar(None::<&gtk::Widget>);
            }
          }
        })?;
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
