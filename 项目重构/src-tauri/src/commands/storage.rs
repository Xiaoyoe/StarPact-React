use crate::models::{ModelConfig, Conversation};
use crate::services::storage::{
    paths::{get_data_dir_info, ensure_data_dirs},
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
            if let Ok(ui_config) = serde_json::from_value::<crate::services::storage::config::UiConfig>(ui.clone()) {
                config.ui = ui_config;
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
