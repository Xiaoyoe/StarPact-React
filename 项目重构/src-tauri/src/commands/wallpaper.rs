use crate::services::storage::{get_database, get_wallpapers_dir, Wallpaper};
use std::path::PathBuf;
use std::fs;
use base64::{Engine as _, engine::general_purpose};

fn generate_id() -> String {
    format!("{}-{}", chrono::Utc::now().timestamp_millis(), uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("unknown"))
}

#[tauri::command]
pub fn get_wallpapers() -> Result<Vec<Wallpaper>, String> {
    get_database().get_wallpapers()
}

#[tauri::command]
pub fn get_active_wallpaper() -> Result<Option<Wallpaper>, String> {
    get_database().get_active_wallpaper()
}

#[tauri::command]
pub fn add_wallpaper(name: String, file_data: String) -> Result<Wallpaper, String> {
    let wallpapers_dir = get_wallpapers_dir();
    let id = generate_id();
    let file_name = format!("{}.png", id);
    let file_path = wallpapers_dir.join(&file_name);
    
    let decoded = general_purpose::STANDARD.decode(&file_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;
    
    fs::write(&file_path, &decoded)
        .map_err(|e| format!("Failed to write wallpaper file: {}", e))?;
    
    let size = decoded.len() as i64;
    let added_at = chrono::Utc::now().timestamp_millis();
    
    let wallpaper = Wallpaper {
        id: id.clone(),
        name,
        file_path: file_path.to_string_lossy().to_string(),
        size,
        added_at,
        is_active: false,
    };
    
    get_database().save_wallpaper(&wallpaper)?;
    
    Ok(wallpaper)
}

#[tauri::command]
pub fn add_wallpaper_from_path(file_path: String, name: String) -> Result<Wallpaper, String> {
    let source_path = PathBuf::from(&file_path);
    
    if !source_path.exists() {
        return Err("Source file does not exist".to_string());
    }
    
    let wallpapers_dir = get_wallpapers_dir();
    let id = generate_id();
    
    let extension = source_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");
    
    let file_name = format!("{}.{}", id, extension);
    let dest_path = wallpapers_dir.join(&file_name);
    
    fs::copy(&source_path, &dest_path)
        .map_err(|e| format!("Failed to copy wallpaper file: {}", e))?;
    
    let metadata = fs::metadata(&dest_path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;
    
    let size = metadata.len() as i64;
    let added_at = chrono::Utc::now().timestamp_millis();
    
    let wallpaper = Wallpaper {
        id: id.clone(),
        name,
        file_path: dest_path.to_string_lossy().to_string(),
        size,
        added_at,
        is_active: false,
    };
    
    get_database().save_wallpaper(&wallpaper)?;
    
    Ok(wallpaper)
}

#[tauri::command]
pub fn delete_wallpaper(id: String) -> Result<(), String> {
    let wallpapers = get_database().get_wallpapers()?;
    
    if let Some(wallpaper) = wallpapers.iter().find(|w| w.id == id) {
        let path = PathBuf::from(&wallpaper.file_path);
        if path.exists() {
            fs::remove_file(&path)
                .map_err(|e| format!("Failed to delete wallpaper file: {}", e))?;
        }
    }
    
    get_database().delete_wallpaper(&id)
}

#[tauri::command]
pub fn clear_all_wallpapers() -> Result<(), String> {
    let wallpapers_dir = get_wallpapers_dir();
    
    if wallpapers_dir.exists() {
        for entry in fs::read_dir(&wallpapers_dir).map_err(|e| e.to_string())? {
            if let Ok(entry) = entry {
                let _ = fs::remove_file(entry.path());
            }
        }
    }
    
    get_database().clear_wallpapers()
}

#[tauri::command]
pub fn set_active_wallpaper(id: String) -> Result<(), String> {
    get_database().set_active_wallpaper(&id)
}

#[tauri::command]
pub fn clear_active_wallpaper() -> Result<(), String> {
    get_database().set_active_wallpaper("")
}

#[tauri::command]
pub fn get_wallpaper_setting(key: String) -> Result<Option<String>, String> {
    get_database().get_setting(&key)
}

#[tauri::command]
pub fn set_wallpaper_setting(key: String, value: String) -> Result<(), String> {
    get_database().set_setting(&key, &value)
}

#[tauri::command]
pub fn read_wallpaper_file(id: String) -> Result<String, String> {
    let wallpapers = get_database().get_wallpapers()?;
    
    if let Some(wallpaper) = wallpapers.iter().find(|w| w.id == id) {
        let path = PathBuf::from(&wallpaper.file_path);
        if path.exists() {
            let data = fs::read(&path)
                .map_err(|e| format!("Failed to read wallpaper file: {}", e))?;
            return Ok(general_purpose::STANDARD.encode(&data));
        }
    }
    
    Err("Wallpaper not found".to_string())
}
