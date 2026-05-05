use crate::models::{ModelConfig, Conversation};
use crate::services::storage::{
    paths::{get_data_dir_info, ensure_data_dirs, get_data_dir},
    config::{get_config, update_config, AppConfig, FfmpegConfig, save_ffmpeg_config, get_ffmpeg_config, get_module_path, save_module_path},
    database::get_database,
    backup::{create_backup, restore_backup, list_backups, delete_backup, BackupInfo},
};

#[tauri::command]
pub async fn get_models() -> Result<Vec<ModelConfig>, String> {
    let db = get_database();
    db.get_models()
}

#[tauri::command]
pub async fn save_models(models: Vec<ModelConfig>) -> Result<(), String> {
    let db = get_database();
    db.save_models(models)
}

#[tauri::command]
pub async fn get_conversations() -> Result<Vec<Conversation>, String> {
    let db = get_database();
    db.get_conversations()
}

#[tauri::command]
pub async fn save_conversations(conversations: Vec<Conversation>) -> Result<(), String> {
    let db = get_database();
    db.save_conversations(conversations)
}

#[tauri::command]
pub async fn storage_get_module_path(module: String) -> Result<Option<String>, String> {
    Ok(get_module_path(&module))
}

#[tauri::command]
pub async fn storage_save_module_path(module: String, path: String) -> Result<(), String> {
    save_module_path(module, path)
}

#[tauri::command]
pub async fn storage_check_all_paths() -> Result<bool, String> {
    ensure_data_dirs()?;
    Ok(true)
}

#[tauri::command]
pub async fn storage_get_data_dir_info() -> Result<crate::services::storage::paths::DataDirInfo, String> {
    Ok(get_data_dir_info())
}

#[tauri::command]
pub async fn storage_get_config() -> Result<AppConfig, String> {
    let config = get_config();
    Ok(config.clone())
}

#[tauri::command]
pub async fn storage_update_config(updates: serde_json::Value) -> Result<(), String> {
    update_config(|config| {
        if let Some(theme) = updates.get("theme") {
            if let Some(theme_str) = theme.as_str() {
                config.theme = theme_str.to_string();
            }
        }
        if let Some(language) = updates.get("language") {
            if let Some(lang_str) = language.as_str() {
                config.language = lang_str.to_string();
            }
        }
        if let Some(ui) = updates.get("ui") {
            if let Some(ui_obj) = ui.as_object() {
                if let Some(app_name_display) = ui_obj.get("app_name_display") {
                    if let Some(val) = app_name_display.as_str() {
                        config.ui.app_name_display = val.to_string();
                    }
                }
                if let Some(default_page) = ui_obj.get("default_page") {
                    if let Some(val) = default_page.as_str() {
                        config.ui.default_page = val.to_string();
                    }
                }
                if let Some(gallery_default_layout) = ui_obj.get("gallery_default_layout") {
                    if let Some(val) = gallery_default_layout.as_str() {
                        config.ui.gallery_default_layout = val.to_string();
                    }
                }
                if let Some(daily_quote_enabled) = ui_obj.get("daily_quote_enabled") {
                    if let Some(val) = daily_quote_enabled.as_bool() {
                        config.ui.daily_quote_enabled = val;
                    }
                }
                if let Some(daily_quote_interval) = ui_obj.get("daily_quote_interval") {
                    if let Some(val) = daily_quote_interval.as_u64() {
                        config.ui.daily_quote_interval = val as u32;
                    }
                }
                if let Some(chat_notification_enabled) = ui_obj.get("chat_notification_enabled") {
                    if let Some(val) = chat_notification_enabled.as_bool() {
                        config.ui.chat_notification_enabled = val;
                    }
                }
                if let Some(close_confirm) = ui_obj.get("close_confirm") {
                    if let Some(val) = close_confirm.as_bool() {
                        config.ui.close_confirm = val;
                    }
                }
                if let Some(send_on_enter) = ui_obj.get("send_on_enter") {
                    if let Some(val) = send_on_enter.as_bool() {
                        config.ui.send_on_enter = val;
                    }
                }
                if let Some(splash_screen_enabled) = ui_obj.get("splash_screen_enabled") {
                    if let Some(val) = splash_screen_enabled.as_bool() {
                        config.ui.splash_screen_enabled = val;
                    }
                }
                if let Some(splash_screen_type) = ui_obj.get("splash_screen_type") {
                    if let Some(val) = splash_screen_type.as_str() {
                        config.ui.splash_screen_type = val.to_string();
                    }
                }
            }
        }
    })
}

#[tauri::command]
pub async fn storage_get_ffmpeg_config() -> Result<FfmpegConfig, String> {
    Ok(get_ffmpeg_config())
}

#[tauri::command]
pub async fn storage_save_ffmpeg_config(config: FfmpegConfig) -> Result<(), String> {
    save_ffmpeg_config(config)
}

#[tauri::command]
pub async fn storage_create_backup(name: Option<String>) -> Result<String, String> {
    create_backup(name)
}

#[tauri::command]
pub async fn storage_restore_backup(backup_path: String) -> Result<(), String> {
    restore_backup(backup_path)
}

#[tauri::command]
pub async fn storage_list_backups() -> Result<Vec<BackupInfo>, String> {
    list_backups()
}

#[tauri::command]
pub async fn storage_delete_backup(backup_path: String) -> Result<(), String> {
    delete_backup(backup_path)
}

#[tauri::command]
pub async fn storage_ensure_dirs() -> Result<(), String> {
    ensure_data_dirs()
}

#[tauri::command]
pub async fn storage_reset_to_factory() -> Result<(), String> {
    let db = get_database();
    db.clear_all_data()?;
    
    let data_dir = get_data_dir();
    
    let dirs_to_clear = [
        "images",
        "images/thumbnails",
        "videos",
        "videos/cache",
        "wallpapers",
        "cache",
        "exports",
        "exports/ini",
        "exports/prompts",
    ];
    
    for dir_name in dirs_to_clear.iter() {
        let dir_path = data_dir.join(dir_name);
        if dir_path.exists() {
            std::fs::remove_dir_all(&dir_path)
                .map_err(|e| format!("Failed to remove {}: {}", dir_name, e))?;
            std::fs::create_dir_all(&dir_path)
                .map_err(|e| format!("Failed to recreate {}: {}", dir_name, e))?;
        }
    }
    
    let config_path = data_dir.join("config.json");
    let default_config = AppConfig::default();
    let config_content = serde_json::to_string_pretty(&default_config)
        .map_err(|e| format!("Failed to serialize default config: {}", e))?;
    std::fs::write(&config_path, config_content)
        .map_err(|e| format!("Failed to write default config: {}", e))?;
    
    ensure_data_dirs()?;
    
    Ok(())
}
