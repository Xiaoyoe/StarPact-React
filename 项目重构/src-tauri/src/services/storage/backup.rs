use std::path::PathBuf;
use std::fs;
use walkdir::WalkDir;
use super::paths::{get_data_dir, get_backups_dir};

#[derive(Debug, Clone, serde::Serialize)]
pub struct BackupInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub created_at: u64,
}

fn get_dir_size(path: &PathBuf) -> u64 {
    let mut size = 0;
    if path.is_dir() {
        for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                if let Ok(metadata) = entry.metadata() {
                    size += metadata.len();
                }
            }
        }
    } else if path.is_file() {
        if let Ok(metadata) = path.metadata() {
            size = metadata.len();
        }
    }
    size
}

fn copy_dir_all(src: &PathBuf, dst: &PathBuf) -> Result<(), String> {
    if !dst.exists() {
        fs::create_dir_all(dst)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    for entry in WalkDir::new(src).into_iter().filter_map(|e| e.ok()) {
        let relative = entry.path().strip_prefix(src)
            .map_err(|e| format!("Failed to get relative path: {}", e))?;
        let dest_path = dst.join(relative);
        
        if entry.file_type().is_dir() {
            if !dest_path.exists() {
                fs::create_dir_all(&dest_path)
                    .map_err(|e| format!("Failed to create directory: {}", e))?;
            }
        } else if entry.file_type().is_file() {
            if let Some(parent) = dest_path.parent() {
                if !parent.exists() {
                    fs::create_dir_all(parent)
                        .map_err(|e| format!("Failed to create parent directory: {}", e))?;
                }
            }
            fs::copy(entry.path(), &dest_path)
                .map_err(|e| format!("Failed to copy file: {}", e))?;
        }
    }
    
    Ok(())
}

pub fn create_backup(name: Option<String>) -> Result<String, String> {
    let backups_dir = get_backups_dir();
    let data_dir = get_data_dir();
    
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_name = name.unwrap_or_else(|| format!("backup_{}", timestamp));
    let backup_path = backups_dir.join(&backup_name);
    
    if backup_path.exists() {
        fs::remove_dir_all(&backup_path)
            .map_err(|e| format!("Failed to remove existing backup: {}", e))?;
    }
    
    copy_dir_all(&data_dir, &backup_path)?;
    
    Ok(backup_path.to_string_lossy().to_string())
}

pub fn restore_backup(backup_path: String) -> Result<(), String> {
    let backup_path = PathBuf::from(&backup_path);
    
    if !backup_path.exists() {
        return Err(format!("Backup not found: {}", backup_path.display()));
    }
    
    let data_dir = get_data_dir();
    
    if data_dir.exists() {
        fs::remove_dir_all(&data_dir)
            .map_err(|e| format!("Failed to remove existing data directory: {}", e))?;
    }
    
    copy_dir_all(&backup_path, &data_dir)?;
    
    Ok(())
}

pub fn list_backups() -> Result<Vec<BackupInfo>, String> {
    let backups_dir = get_backups_dir();
    let mut backups = Vec::new();
    
    if !backups_dir.exists() {
        return Ok(backups);
    }
    
    for entry in fs::read_dir(&backups_dir)
        .map_err(|e| format!("Failed to read backups directory: {}", e))?
    {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.is_dir() {
            let metadata = entry.metadata().map_err(|e| e.to_string())?;
            let created = metadata.created()
                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs())
                .unwrap_or(0);
            
            let name = path.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
            
            let size = get_dir_size(&path);
            
            backups.push(BackupInfo {
                name,
                path: path.to_string_lossy().to_string(),
                size,
                created_at: created,
            });
        }
    }
    
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    
    Ok(backups)
}

pub fn delete_backup(backup_path: String) -> Result<(), String> {
    let path = PathBuf::from(&backup_path);
    
    if path.exists() {
        if path.is_dir() {
            fs::remove_dir_all(&path)
                .map_err(|e| format!("Failed to delete backup: {}", e))?;
        } else {
            fs::remove_file(&path)
                .map_err(|e| format!("Failed to delete backup: {}", e))?;
        }
    }
    
    Ok(())
}
