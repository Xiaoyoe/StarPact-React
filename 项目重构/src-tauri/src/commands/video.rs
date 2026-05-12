use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use crate::services::storage::paths;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoPlaylist {
    pub id: String,
    pub name: String,
    pub videos: Vec<VideoItem>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub duration: f64,
    pub added_at: u64,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiVideoLayout {
    pub id: String,
    pub name: String,
    pub videos: Vec<LayoutVideo>,
    pub grid_columns: u32,
    pub grid_rows: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutVideo {
    pub video_id: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub z_index: u32,
    pub opacity: f32,
    pub volume: f32,
    pub muted: bool,
}

fn get_video_playlists_file() -> PathBuf {
    let data_dir = paths::get_data_dir();
    data_dir.join("video_playlists.json")
}

fn get_multi_video_layouts_file() -> PathBuf {
    let data_dir = paths::get_data_dir();
    data_dir.join("multi_video_layouts.json")
}

#[tauri::command]
pub async fn get_video_playlists() -> Result<Vec<VideoPlaylist>, String> {
    let file_path = get_video_playlists_file();
    
    if !file_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read video playlists: {}", e))?;
    
    let playlists: Vec<VideoPlaylist> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse video playlists: {}", e))?;
    
    Ok(playlists)
}

#[tauri::command]
pub async fn save_video_playlists(playlists: Vec<VideoPlaylist>) -> Result<(), String> {
    let file_path = get_video_playlists_file();
    
    let content = serde_json::to_string_pretty(&playlists)
        .map_err(|e| format!("Failed to serialize video playlists: {}", e))?;
    
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write video playlists: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_all_playlists_json() -> Result<String, String> {
    let file_path = get_video_playlists_file();
    
    if !file_path.exists() {
        return Ok("[]".to_string());
    }
    
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read video playlists: {}", e))?;
    
    Ok(content)
}

#[tauri::command]
pub async fn get_data_dir() -> Result<String, String> {
    let data_dir = paths::get_data_dir();
    data_dir.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Failed to get data directory path".to_string())
}

#[tauri::command]
pub async fn create_video_playlist(name: String) -> Result<VideoPlaylist, String> {
    let mut playlists = get_video_playlists().await?;
    
    let playlist = VideoPlaylist {
        id: format!("playlist_{}", chrono::Utc::now().timestamp_millis()),
        name,
        videos: Vec::new(),
        created_at: chrono::Utc::now().timestamp_millis() as u64,
        updated_at: chrono::Utc::now().timestamp_millis() as u64,
    };
    
    playlists.push(playlist.clone());
    save_video_playlists(playlists).await?;
    
    Ok(playlist)
}

#[tauri::command]
pub async fn add_video_to_playlist(
    playlist_id: String,
    video: VideoItem,
) -> Result<(), String> {
    let mut playlists = get_video_playlists().await?;
    
    let playlist = playlists.iter_mut().find(|p| p.id == playlist_id)
        .ok_or_else(|| format!("Playlist not found: {}", playlist_id))?;
    
    playlist.videos.push(video);
    playlist.updated_at = chrono::Utc::now().timestamp_millis() as u64;
    
    save_video_playlists(playlists).await?;
    
    Ok(())
}

#[tauri::command]
pub async fn remove_video_from_playlist(
    playlist_id: String,
    video_id: String,
) -> Result<(), String> {
    let mut playlists = get_video_playlists().await?;
    
    let playlist = playlists.iter_mut().find(|p| p.id == playlist_id)
        .ok_or_else(|| format!("Playlist not found: {}", playlist_id))?;
    
    playlist.videos.retain(|v| v.id != video_id);
    playlist.updated_at = chrono::Utc::now().timestamp_millis() as u64;
    
    save_video_playlists(playlists).await?;
    
    Ok(())
}

#[tauri::command]
pub async fn delete_video_playlist(playlist_id: String) -> Result<(), String> {
    let mut playlists = get_video_playlists().await?;
    
    playlists.retain(|p| p.id != playlist_id);
    
    save_video_playlists(playlists).await?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_multi_video_layouts() -> Result<Vec<MultiVideoLayout>, String> {
    let file_path = get_multi_video_layouts_file();
    
    if !file_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read multi video layouts: {}", e))?;
    
    let layouts: Vec<MultiVideoLayout> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse multi video layouts: {}", e))?;
    
    Ok(layouts)
}

#[tauri::command]
pub async fn save_multi_video_layouts(layouts: Vec<MultiVideoLayout>) -> Result<(), String> {
    let file_path = get_multi_video_layouts_file();
    
    let content = serde_json::to_string_pretty(&layouts)
        .map_err(|e| format!("Failed to serialize multi video layouts: {}", e))?;
    
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write multi video layouts: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn create_multi_video_layout(
    name: String,
    grid_columns: u32,
    grid_rows: u32,
) -> Result<MultiVideoLayout, String> {
    let mut layouts = get_multi_video_layouts().await?;
    
    let layout = MultiVideoLayout {
        id: format!("layout_{}", chrono::Utc::now().timestamp_millis()),
        name,
        videos: Vec::new(),
        grid_columns,
        grid_rows,
    };
    
    layouts.push(layout.clone());
    save_multi_video_layouts(layouts).await?;
    
    Ok(layout)
}

#[tauri::command]
pub async fn add_video_to_layout(
    layout_id: String,
    video: LayoutVideo,
) -> Result<(), String> {
    let mut layouts = get_multi_video_layouts().await?;
    
    let layout = layouts.iter_mut().find(|l| l.id == layout_id)
        .ok_or_else(|| format!("Layout not found: {}", layout_id))?;
    
    layout.videos.push(video);
    
    save_multi_video_layouts(layouts).await?;
    
    Ok(())
}

#[tauri::command]
pub async fn update_layout_video(
    layout_id: String,
    video_id: String,
    updates: LayoutVideo,
) -> Result<(), String> {
    let mut layouts = get_multi_video_layouts().await?;
    
    let layout = layouts.iter_mut().find(|l| l.id == layout_id)
        .ok_or_else(|| format!("Layout not found: {}", layout_id))?;
    
    let video = layout.videos.iter_mut().find(|v| v.video_id == video_id)
        .ok_or_else(|| format!("Video not found in layout: {}", video_id))?;
    
    *video = updates;
    
    save_multi_video_layouts(layouts).await?;
    
    Ok(())
}

#[tauri::command]
pub async fn delete_multi_video_layout(layout_id: String) -> Result<(), String> {
    let mut layouts = get_multi_video_layouts().await?;
    
    layouts.retain(|l| l.id != layout_id);
    
    save_multi_video_layouts(layouts).await?;
    
    Ok(())
}
