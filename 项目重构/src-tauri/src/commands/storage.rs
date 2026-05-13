use crate::models::{ModelConfig, Conversation};
use crate::services::storage::{
    paths::{get_data_dir_info, ensure_data_dirs, get_data_dir, get_prompt_templates_path},
    config::{get_config, update_config, AppConfig, FfmpegConfig, save_ffmpeg_config, get_ffmpeg_config, get_module_path, save_module_path},
    database::get_database,
    backup::{create_backup, restore_backup, list_backups, delete_backup, BackupInfo},
};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use zip::{ZipArchive, ZipWriter};
use zip::write::FileOptions;
use std::io::{self, Write};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptTemplateResult {
    pub id: String,
    #[serde(rename = "type")]
    pub result_type: String,
    pub version_note: String,
    pub created_at: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptTemplate {
    pub id: String,
    pub title: String,
    pub category: String,
    pub tags: Vec<String>,
    pub version_note: String,
    pub content: String,
    pub results: Vec<PromptTemplateResult>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptTemplatesData {
    pub templates: Vec<PromptTemplate>,
}

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
                if let Some(splash_screen_use_wallpaper) = ui_obj.get("splash_screen_use_wallpaper") {
                    if let Some(val) = splash_screen_use_wallpaper.as_bool() {
                        config.ui.splash_screen_use_wallpaper = val;
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

#[tauri::command]
pub async fn get_prompt_templates() -> Result<Vec<PromptTemplate>, String> {
    let path = get_prompt_templates_path();
    
    if !path.exists() {
        return Ok(Vec::new());
    }
    
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read prompt templates: {}", e))?;
    
    let data: PromptTemplatesData = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse prompt templates: {}", e))?;
    
    Ok(data.templates)
}

#[tauri::command]
pub async fn save_prompt_templates(templates: Vec<PromptTemplate>) -> Result<(), String> {
    let path = get_prompt_templates_path();
    
    let data = PromptTemplatesData { templates };
    
    let content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize prompt templates: {}", e))?;
    
    std::fs::write(&path, content)
        .map_err(|e| format!("Failed to write prompt templates: {}", e))?;
    
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
    pub children: Option<Vec<FileNode>>,
}

fn build_file_tree(path: &Path, base_path: &Path) -> Result<FileNode, String> {
    let name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    
    let relative_path = path.strip_prefix(base_path)
        .map_err(|e| format!("Failed to get relative path: {}", e))?
        .to_str()
        .unwrap_or("")
        .to_string();
    
    let is_dir = path.is_dir();
    let size = if is_dir {
        None
    } else {
        Some(path.metadata()
            .map_err(|e| format!("Failed to get metadata: {}", e))?
            .len())
    };
    
    let children = if is_dir {
        let mut child_nodes = Vec::new();
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let child_path = entry.path();
                if let Ok(child_node) = build_file_tree(&child_path, base_path) {
                    child_nodes.push(child_node);
                }
            }
        }
        child_nodes.sort_by(|a, b| {
            if a.is_dir != b.is_dir {
                b.is_dir.cmp(&a.is_dir)
            } else {
                a.name.cmp(&b.name)
            }
        });
        Some(child_nodes)
    } else {
        None
    };
    
    Ok(FileNode {
        name,
        path: relative_path,
        is_dir,
        size,
        children,
    })
}

#[tauri::command]
pub async fn get_data_folder_structure() -> Result<Vec<FileNode>, String> {
    let data_dir = get_data_dir();
    ensure_data_dirs()?;
    
    let mut root_nodes = Vec::new();
    
    let important_dirs = [
        "images",
        "videos",
        "wallpapers",
        "cache",
        "exports",
        "backups",
    ];
    
    for dir_name in important_dirs.iter() {
        let dir_path = data_dir.join(dir_name);
        if dir_path.exists() {
            if let Ok(node) = build_file_tree(&dir_path, &data_dir) {
                root_nodes.push(node);
            }
        }
    }
    
    let db_path = data_dir.join("starpact.db");
    if db_path.exists() {
        if let Ok(node) = build_file_tree(&db_path, &data_dir) {
            root_nodes.push(node);
        }
    }
    
    let config_path = data_dir.join("config.json");
    if config_path.exists() {
        if let Ok(node) = build_file_tree(&config_path, &data_dir) {
            root_nodes.push(node);
        }
    }
    
    Ok(root_nodes)
}

fn add_dir_to_zip<W: Write + io::Seek>(
    zip: &mut ZipWriter<W>,
    base_path: &Path,
    current_path: &Path,
) -> Result<(), String> {
    if current_path.is_dir() {
        let entries = fs::read_dir(current_path)
            .map_err(|e| format!("Failed to read directory: {}", e))?;
        
        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            
            let relative = path.strip_prefix(base_path)
                .map_err(|e| format!("Failed to strip prefix: {}", e))?;
            let name = relative.to_str()
                .ok_or("Invalid path")?;
            
            if path.is_dir() {
                zip.add_directory(name, FileOptions::default())
                    .map_err(|e| format!("Failed to add directory: {}", e))?;
                add_dir_to_zip(zip, base_path, &path)?;
            } else {
                let file_content = fs::read(&path)
                    .map_err(|e| format!("Failed to read file: {}", e))?;
                
                zip.start_file(name, FileOptions::default())
                    .map_err(|e| format!("Failed to start file: {}", e))?;
                zip.write_all(&file_content)
                    .map_err(|e| format!("Failed to write file: {}", e))?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn export_data(output_path: String) -> Result<(), String> {
    let data_dir = get_data_dir();
    ensure_data_dirs()?;
    
    let file = fs::File::create(&output_path)
        .map_err(|e| format!("Failed to create output file: {}", e))?;
    let mut zip = ZipWriter::new(file);
    
    add_dir_to_zip(&mut zip, &data_dir, &data_dir)?;
    
    zip.finish()
        .map_err(|e| format!("Failed to finish zip: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn import_data(input_path: String) -> Result<(), String> {
    let data_dir = get_data_dir();
    
    let file = fs::File::open(&input_path)
        .map_err(|e| format!("Failed to open input file: {}", e))?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("Failed to open zip archive: {}", e))?;
    
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to get file from archive: {}", e))?;
        
        let outpath = data_dir.join(file.name());
        
        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(p)
                        .map_err(|e| format!("Failed to create parent directory: {}", e))?;
                }
            }
            let mut outfile = fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create output file: {}", e))?;
            io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to copy file: {}", e))?;
        }
    }
    
    Ok(())
}

#[tauri::command]
pub async fn open_data_folder() -> Result<(), String> {
    let data_dir = get_data_dir();
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&data_dir)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&data_dir)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&data_dir)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    Ok(())
}
