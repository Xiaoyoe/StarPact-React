use crate::services::wallpaper::{self, WallpaperItem};
use base64::{Engine as _, engine::general_purpose};

#[tauri::command]
pub fn get_wallpapers() -> Result<Vec<WallpaperItem>, String> {
    wallpaper::get_all_wallpapers()
}

#[tauri::command]
pub fn get_active_wallpaper() -> Result<Option<WallpaperItem>, String> {
    wallpaper::get_active_wallpaper()
}

#[tauri::command]
pub fn add_wallpaper_from_path(file_path: String, name: String) -> Result<WallpaperItem, String> {
    wallpaper::add_wallpaper_from_path(file_path, name)
}

#[tauri::command]
pub fn add_wallpaper_from_url(url: String, name: String) -> Result<WallpaperItem, String> {
    wallpaper::add_wallpaper_from_url(url, name)
}

#[tauri::command]
pub fn delete_wallpaper(id: String) -> Result<(), String> {
    wallpaper::delete_wallpaper(&id)
}

#[tauri::command]
pub fn clear_all_wallpapers() -> Result<(), String> {
    wallpaper::clear_all_wallpapers()
}

#[tauri::command]
pub fn set_active_wallpaper(id: String) -> Result<(), String> {
    wallpaper::set_active_wallpaper(id)
}

#[tauri::command]
pub fn clear_active_wallpaper() -> Result<(), String> {
    wallpaper::clear_active_wallpaper()
}

#[tauri::command]
pub fn get_wallpaper_setting(key: String) -> Result<Option<String>, String> {
    match key.as_str() {
        "doubleClickToChange" => {
            let value = wallpaper::get_double_click_to_change()?;
            Ok(Some(value.to_string()))
        }
        _ => Ok(None),
    }
}

#[tauri::command]
pub fn set_wallpaper_setting(key: String, value: String) -> Result<(), String> {
    match key.as_str() {
        "doubleClickToChange" => {
            let bool_value = value == "true";
            wallpaper::set_double_click_to_change(bool_value)
        }
        _ => Ok(()),
    }
}

#[tauri::command]
pub fn read_wallpaper_file(path: String) -> Result<String, String> {
    let data = wallpaper::read_wallpaper_file(&path)?;
    Ok(general_purpose::STANDARD.encode(&data))
}
