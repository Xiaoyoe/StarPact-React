use std::path::PathBuf;
use std::fs;
use std::sync::{Mutex, OnceLock};
use serde::{Deserialize, Serialize};
use crate::services::storage::paths::get_data_dir;

static WALLPAPER_CONFIG: OnceLock<Mutex<WallpaperConfig>> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WallpaperItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub added_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WallpaperConfig {
    pub wallpapers: Vec<WallpaperItem>,
    pub active_id: Option<String>,
    pub double_click_to_change: bool,
}

fn get_config_path() -> PathBuf {
    get_data_dir().join("wallpapers.json")
}

fn get_wallpapers_dir() -> PathBuf {
    let dir = get_data_dir().join("wallpapers");
    if !dir.exists() {
        fs::create_dir_all(&dir).ok();
    }
    dir
}

pub fn get_wallpaper_config() -> &'static Mutex<WallpaperConfig> {
    WALLPAPER_CONFIG.get_or_init(|| {
        let config = load_config().unwrap_or_default();
        Mutex::new(config)
    })
}

fn load_config() -> Result<WallpaperConfig, String> {
    let path = get_config_path();
    if !path.exists() {
        return Ok(WallpaperConfig::default());
    }
    
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read wallpaper config: {}", e))?;
    
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse wallpaper config: {}", e))
}

fn save_config(config: &WallpaperConfig) -> Result<(), String> {
    let path = get_config_path();
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize wallpaper config: {}", e))?;
    
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write wallpaper config: {}", e))
}

pub fn get_all_wallpapers() -> Result<Vec<WallpaperItem>, String> {
    let config = get_wallpaper_config().lock().map_err(|e| e.to_string())?;
    Ok(config.wallpapers.clone())
}

pub fn get_active_wallpaper() -> Result<Option<WallpaperItem>, String> {
    let config = get_wallpaper_config().lock().map_err(|e| e.to_string())?;
    
    if let Some(active_id) = &config.active_id {
        return Ok(config.wallpapers.iter().find(|w| &w.id == active_id).cloned());
    }
    
    Ok(None)
}

pub fn add_wallpaper_from_path(path: String, name: String) -> Result<WallpaperItem, String> {
    let source_path = PathBuf::from(&path);
    
    if !source_path.exists() {
        return Err("Source file does not exist".to_string());
    }
    
    let id = format!("wp_{}_{}", 
        chrono::Utc::now().timestamp_millis(),
        uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("0")
    );
    
    let extension = source_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");
    
    let wallpapers_dir = get_wallpapers_dir();
    let file_name = format!("{}.{}", id, extension);
    let dest_path = wallpapers_dir.join(&file_name);
    
    fs::copy(&source_path, &dest_path)
        .map_err(|e| format!("Failed to copy wallpaper: {}", e))?;
    
    let added_at = chrono::Utc::now().timestamp_millis() as u64;
    
    let wallpaper = WallpaperItem {
        id: id.clone(),
        name,
        path: dest_path.to_string_lossy().to_string(),
        added_at,
    };
    
    let mut config = get_wallpaper_config().lock().map_err(|e| e.to_string())?;
    config.wallpapers.push(wallpaper.clone());
    save_config(&config)?;
    
    Ok(wallpaper)
}

pub fn add_wallpaper_from_url(url: String, name: String) -> Result<WallpaperItem, String> {
    let id = format!("wp_{}_{}", 
        chrono::Utc::now().timestamp_millis(),
        uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("0")
    );
    
    let added_at = chrono::Utc::now().timestamp_millis() as u64;
    
    let wallpaper = WallpaperItem {
        id: id.clone(),
        name,
        path: url,
        added_at,
    };
    
    let mut config = get_wallpaper_config().lock().map_err(|e| e.to_string())?;
    config.wallpapers.push(wallpaper.clone());
    save_config(&config)?;
    
    Ok(wallpaper)
}

pub fn set_active_wallpaper(id: String) -> Result<(), String> {
    let mut config = get_wallpaper_config().lock().map_err(|e| e.to_string())?;
    
    if !config.wallpapers.iter().any(|w| w.id == id) {
        return Err("Wallpaper not found".to_string());
    }
    
    config.active_id = Some(id);
    save_config(&config)
}

pub fn clear_active_wallpaper() -> Result<(), String> {
    let mut config = get_wallpaper_config().lock().map_err(|e| e.to_string())?;
    config.active_id = None;
    save_config(&config)
}

pub fn delete_wallpaper(id: &str) -> Result<(), String> {
    let mut config = get_wallpaper_config().lock().map_err(|e| e.to_string())?;
    
    if let Some(wallpaper) = config.wallpapers.iter().find(|w| w.id == id) {
        let path = PathBuf::from(&wallpaper.path);
        if path.exists() && path.starts_with(get_wallpapers_dir()) {
            fs::remove_file(&path).ok();
        }
    }
    
    config.wallpapers.retain(|w| w.id != id);
    
    if config.active_id.as_deref() == Some(id) {
        config.active_id = None;
    }
    
    save_config(&config)
}

pub fn clear_all_wallpapers() -> Result<(), String> {
    let wallpapers_dir = get_wallpapers_dir();
    
    if wallpapers_dir.exists() {
        for entry in fs::read_dir(&wallpapers_dir).map_err(|e| e.to_string())? {
            if let Ok(entry) = entry {
                fs::remove_file(entry.path()).ok();
            }
        }
    }
    
    let mut config = get_wallpaper_config().lock().map_err(|e| e.to_string())?;
    config.wallpapers.clear();
    config.active_id = None;
    save_config(&config)
}

pub fn set_double_click_to_change(value: bool) -> Result<(), String> {
    let mut config = get_wallpaper_config().lock().map_err(|e| e.to_string())?;
    config.double_click_to_change = value;
    save_config(&config)
}

pub fn get_double_click_to_change() -> Result<bool, String> {
    let config = get_wallpaper_config().lock().map_err(|e| e.to_string())?;
    Ok(config.double_click_to_change)
}

pub fn read_wallpaper_file(path: &str) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|e| format!("Failed to read wallpaper file: {}", e))
}
