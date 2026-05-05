use crate::models::{ImageMetadata, ImageAlbum};
use crate::services::storage::{database::get_database, paths::get_data_dir};
use std::fs;

#[tauri::command]
pub async fn get_albums() -> Result<Vec<ImageAlbum>, String> {
    let db = get_database();
    db.get_albums()
}

#[tauri::command]
pub async fn save_album(album: ImageAlbum) -> Result<(), String> {
    let db = get_database();
    db.save_album(&album)
}

#[tauri::command]
pub async fn delete_album(album_id: String) -> Result<(), String> {
    let db = get_database();
    
    let images = db.get_images(&album_id)?;
    for image in images {
        if let Err(e) = fs::remove_file(&image.file_path) {
            eprintln!("Failed to delete image file: {}", e);
        }
        if let Some(thumb_path) = image.thumbnail_path {
            if let Err(e) = fs::remove_file(&thumb_path) {
                eprintln!("Failed to delete thumbnail: {}", e);
            }
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
    
    let images = db.get_images_by_id(&image_id)?;
    for image in images {
        if let Err(e) = fs::remove_file(&image.file_path) {
            eprintln!("Failed to delete image file: {}", e);
        }
        if let Some(thumb_path) = image.thumbnail_path {
            if let Err(e) = fs::remove_file(&thumb_path) {
                eprintln!("Failed to delete thumbnail: {}", e);
            }
        }
    }
    
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
