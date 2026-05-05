use std::path::PathBuf;
use std::sync::OnceLock;

static DATA_DIR: OnceLock<PathBuf> = OnceLock::new();

pub fn get_exe_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
}

pub fn get_project_root() -> PathBuf {
    let exe_dir = get_exe_dir();
    
    let exe_dir_str = exe_dir.to_string_lossy();
    if exe_dir_str.contains("target") {
        if let Some(target_pos) = exe_dir.ancestors().find(|p| {
            let path_str = p.to_string_lossy();
            path_str.ends_with("target\\debug") || 
            path_str.ends_with("target/debug") ||
            path_str.ends_with("target\\release") ||
            path_str.ends_with("target/release")
        }) {
            if let Some(project_root) = target_pos.parent() {
                return project_root.to_path_buf();
            }
        }
    }
    
    exe_dir.clone()
}

pub fn get_data_dir() -> PathBuf {
    DATA_DIR.get_or_init(|| {
        let data_dir = get_project_root().join("data");
        if !data_dir.exists() {
            let _ = std::fs::create_dir_all(&data_dir);
        }
        data_dir
    }).clone()
}

pub fn get_config_path() -> PathBuf {
    get_data_dir().join("config.json")
}

pub fn get_database_path() -> PathBuf {
    get_data_dir().join("starpact.db")
}

pub fn get_images_dir() -> PathBuf {
    let dir = get_data_dir().join("images");
    if !dir.exists() {
        let _ = std::fs::create_dir_all(&dir);
    }
    dir
}

pub fn get_videos_dir() -> PathBuf {
    let dir = get_data_dir().join("videos");
    if !dir.exists() {
        let _ = std::fs::create_dir_all(&dir);
    }
    dir
}

pub fn get_ffmpeg_dir() -> PathBuf {
    let dir = get_data_dir().join("ffmpeg");
    if !dir.exists() {
        let _ = std::fs::create_dir_all(&dir);
    }
    dir
}

pub fn get_backups_dir() -> PathBuf {
    let dir = get_data_dir().join("backups");
    if !dir.exists() {
        let _ = std::fs::create_dir_all(&dir);
    }
    dir
}

pub fn get_wallpapers_dir() -> PathBuf {
    let dir = get_data_dir().join("wallpapers");
    if !dir.exists() {
        let _ = std::fs::create_dir_all(&dir);
    }
    dir
}

pub fn ensure_data_dirs() -> Result<(), String> {
    let data_dir = get_data_dir();
    let subdirs = [
        "images", "images/thumbnails", "videos", "videos/cache", 
        "ffmpeg", "ffmpeg/config", "ffmpeg/logs", "backups", 
        "wallpapers", "exports", "exports/ini", "exports/prompts", "cache"
    ];
    
    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }
    
    for subdir in subdirs {
        let path = data_dir.join(subdir);
        if !path.exists() {
            std::fs::create_dir_all(&path)
                .map_err(|e| format!("Failed to create {} directory: {}", subdir, e))?;
        }
    }
    
    Ok(())
}

pub fn get_data_dir_info() -> DataDirInfo {
    DataDirInfo {
        exe_dir: get_exe_dir().to_string_lossy().to_string(),
        project_root: get_project_root().to_string_lossy().to_string(),
        data_dir: get_data_dir().to_string_lossy().to_string(),
        config_path: get_config_path().to_string_lossy().to_string(),
        database_path: get_database_path().to_string_lossy().to_string(),
        images_dir: get_images_dir().to_string_lossy().to_string(),
        videos_dir: get_videos_dir().to_string_lossy().to_string(),
        ffmpeg_dir: get_ffmpeg_dir().to_string_lossy().to_string(),
        backups_dir: get_backups_dir().to_string_lossy().to_string(),
        wallpapers_dir: get_wallpapers_dir().to_string_lossy().to_string(),
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DataDirInfo {
    pub exe_dir: String,
    pub project_root: String,
    pub data_dir: String,
    pub config_path: String,
    pub database_path: String,
    pub images_dir: String,
    pub videos_dir: String,
    pub ffmpeg_dir: String,
    pub backups_dir: String,
    pub wallpapers_dir: String,
}
