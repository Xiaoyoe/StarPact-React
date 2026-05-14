use crate::models::{ImageMetadata, ImageAlbum};
use crate::services::storage::{database::get_database, paths::{get_data_dir, get_database_path}};
use std::fs;
use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn get_albums() -> Result<Vec<ImageAlbum>, String> {
    let db = get_database();
    db.get_albums()
}

#[tauri::command]
pub async fn get_gallery_data_dir() -> Result<String, String> {
    let data_dir = get_data_dir();
    Ok(data_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_database_file_path() -> Result<String, String> {
    let db_path = get_database_path();
    Ok(db_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn select_folder(app: tauri::AppHandle, _title: String) -> Result<Option<String>, String> {
    let folder_path = app.dialog()
        .file()
        .blocking_pick_folder();
    
    match folder_path {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn list_files_in_folder(folder_path: String, recursive: Option<bool>) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    let path = PathBuf::from(&folder_path);
    let is_recursive = recursive.unwrap_or(false);
    
    fn collect_files(path: &PathBuf, files: &mut Vec<String>, recursive: bool) {
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                if entry_path.is_file() {
                    files.push(entry_path.to_string_lossy().to_string());
                } else if entry_path.is_dir() && recursive {
                    collect_files(&entry_path, files, recursive);
                }
            }
        }
    }
    
    if path.is_dir() {
        collect_files(&path, &mut files, is_recursive);
    }
    
    Ok(files)
}

#[tauri::command]
pub async fn save_album(album: ImageAlbum) -> Result<(), String> {
    let db = get_database();
    db.save_album(&album)
}

#[tauri::command]
pub async fn create_album_with_folder(album: ImageAlbum) -> Result<(), String> {
    let data_dir = get_data_dir();
    let gallery_dir = data_dir.join("gallery");
    let album_dir = gallery_dir.join(&album.name);
    
    fs::create_dir_all(&album_dir).map_err(|e| format!("Failed to create album folder: {}", e))?;
    
    let db = get_database();
    db.save_album(&album)
}

#[tauri::command]
pub async fn delete_album(album_id: String) -> Result<(), String> {
    let db = get_database();
    
    let album = db.get_album_by_id(&album_id)?;
    
    if let Some(album) = album {
        let data_dir = get_data_dir();
        let gallery_dir = data_dir.join("gallery");
        let album_dir = gallery_dir.join(&album.name);
        
        if album_dir.exists() {
            fs::remove_dir_all(&album_dir).map_err(|e| format!("Failed to delete album folder: {}", e))?;
        }
    }
    
    db.delete_album(&album_id)
}

#[tauri::command]
pub async fn get_images(album_id: String) -> Result<Vec<ImageMetadata>, String> {
    let db = get_database();
    db.get_images(&album_id)
}

#[tauri::command]
pub async fn save_image(image: ImageMetadata) -> Result<(), String> {
    let db = get_database();
    db.save_image(&image)
}

#[tauri::command]
pub async fn delete_image(image_id: String) -> Result<(), String> {
    let db = get_database();
    db.delete_image(&image_id)
}

#[tauri::command]
pub async fn update_image_favorite(image_id: String, favorite: bool) -> Result<(), String> {
    let db = get_database();
    db.update_image_favorite(&image_id, favorite)
}

#[tauri::command]
pub async fn upload_image(
    album_id: String,
    file_name: String,
    file_data: Vec<u8>,
) -> Result<ImageMetadata, String> {
    let data_dir = get_data_dir();
    let images_dir = data_dir.join("images");
    fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;
    
    let image_id = format!("image_{}_{}", 
        chrono::Utc::now().timestamp_millis(),
        uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("0")
    );
    
    let extension = file_name.rsplit('.').next().unwrap_or("jpg").to_string();
    let file_name_safe = format!("{}.{}", image_id, extension);
    let file_path = images_dir.join(&file_name_safe);
    
    fs::write(&file_path, &file_data).map_err(|e| e.to_string())?;
    
    let image_type = format!("image/{}", extension);
    let image = ImageMetadata {
        id: image_id.clone(),
        name: file_name,
        size: file_data.len() as u64,
        image_type,
        file_path: file_path.to_string_lossy().to_string(),
        width: 0,
        height: 0,
        added_at: chrono::Utc::now().timestamp_millis() as u64,
        tags: None,
        description: None,
        thumbnail_path: None,
        favorite: Some(false),
        album_id,
    };
    
    let db = get_database();
    db.save_image(&image)?;
    
    Ok(image)
}

#[tauri::command]
pub async fn read_image_file(image_path: String) -> Result<Vec<u8>, String> {
    fs::read(&image_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_image_from_path(
    album_id: String,
    source_path: String,
    file_name: String,
) -> Result<ImageMetadata, String> {
    let image_id = format!("image_{}_{}", 
        chrono::Utc::now().timestamp_millis(),
        uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("0")
    );
    
    let extension = file_name.rsplit('.').next().unwrap_or("jpg").to_string();
    
    let metadata = fs::metadata(&source_path).map_err(|e| e.to_string())?;
    let file_size = metadata.len();
    
    let image_type = format!("image/{}", extension);
    let image = ImageMetadata {
        id: image_id.clone(),
        name: file_name,
        size: file_size,
        image_type,
        file_path: source_path.clone(),
        width: 0,
        height: 0,
        added_at: chrono::Utc::now().timestamp_millis() as u64,
        tags: None,
        description: None,
        thumbnail_path: None,
        favorite: Some(false),
        album_id,
    };
    
    let db = get_database();
    db.save_image(&image)?;
    
    Ok(image)
}

#[tauri::command]
pub async fn import_image_to_album(
    album_id: String,
    source_path: String,
    file_name: String,
) -> Result<ImageMetadata, String> {
    let db = get_database();
    let _album = db.get_album_by_id(&album_id)?.ok_or("Album not found")?;
    
    let image_id = format!("image_{}_{}", 
        chrono::Utc::now().timestamp_millis(),
        uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("0")
    );
    
    let extension = file_name.rsplit('.').next().unwrap_or("jpg").to_string();
    
    let metadata = fs::metadata(&source_path).map_err(|e| e.to_string())?;
    let file_size = metadata.len();
    
    let image_type = format!("image/{}", extension);
    let image = ImageMetadata {
        id: image_id.clone(),
        name: file_name,
        size: file_size,
        image_type,
        file_path: source_path.clone(),
        width: 0,
        height: 0,
        added_at: chrono::Utc::now().timestamp_millis() as u64,
        tags: None,
        description: None,
        thumbnail_path: None,
        favorite: Some(false),
        album_id,
    };
    
    db.save_image(&image)?;
    
    Ok(image)
}

#[tauri::command]
pub async fn get_all_images_json() -> Result<String, String> {
    let db = get_database();
    let images = db.get_all_images()?;
    
    serde_json::to_string_pretty(&images).map_err(|e| e.to_string())
}

#[derive(serde::Deserialize)]
pub struct ImageImportData {
    pub source_path: String,
    pub file_name: String,
}

#[tauri::command]
pub async fn batch_import_images(
    album_id: String,
    images: Vec<ImageImportData>,
) -> Result<usize, String> {
    let db = get_database();
    let _album = db.get_album_by_id(&album_id)?.ok_or("Album not found")?;
    
    let mut success_count = 0;
    let base_time = chrono::Utc::now().timestamp_millis();
    
    for (index, image_data) in images.iter().enumerate() {
        let image_id = format!("image_{}_{}", 
            base_time + index as i64,
            uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("0")
        );
        
        let extension = image_data.file_name.rsplit('.').next().unwrap_or("jpg").to_string();
        
        let metadata = match fs::metadata(&image_data.source_path) {
            Ok(m) => m,
            Err(_) => continue,
        };
        let file_size = metadata.len();
        
        let image_type = format!("image/{}", extension);
        let image = ImageMetadata {
            id: image_id.clone(),
            name: image_data.file_name.clone(),
            size: file_size,
            image_type,
            file_path: image_data.source_path.clone(),
            width: 0,
            height: 0,
            added_at: chrono::Utc::now().timestamp_millis() as u64,
            tags: None,
            description: None,
            thumbnail_path: None,
            favorite: Some(false),
            album_id: album_id.clone(),
        };
        
        match db.save_image(&image) {
            Ok(_) => success_count += 1,
            Err(_) => continue,
        }
    }
    
    Ok(success_count)
}
