use std::path::Path;

#[tauri::command]
pub async fn file_read(file_path: String) -> Result<String, String> {
    tokio::fs::read_to_string(&file_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn file_write(file_path: String, content: String) -> Result<(), String> {
    tokio::fs::write(&file_path, content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn file_delete(file_path: String) -> Result<(), String> {
    tokio::fs::remove_file(&file_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn file_create_folder(folder_path: String) -> Result<(), String> {
    tokio::fs::create_dir_all(&folder_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn file_rename(old_path: String, new_path: String) -> Result<(), String> {
    tokio::fs::rename(&old_path, &new_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn file_get_stats(file_path: String) -> Result<serde_json::Value, String> {
    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Ok(serde_json::json!({
            "success": false,
            "error": "文件不存在"
        }));
    }

    let metadata = tokio::fs::metadata(&file_path)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "success": true,
        "size": metadata.len(),
        "createdTime": metadata.created().ok().and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map(|d| d.as_millis() as u64),
        "modifiedTime": metadata.modified().ok().and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map(|d| d.as_millis() as u64),
        "isFile": metadata.is_file(),
        "isDirectory": metadata.is_dir()
    }))
}

#[tauri::command]
pub async fn file_show_in_folder(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    
    if path.exists() {
        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("explorer")
                .args(["/select,", &file_path])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .args(["-R", &file_path])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        
        #[cfg(target_os = "linux")]
        {
            let parent = path.parent().ok_or("无法获取父目录")?;
            std::process::Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}
