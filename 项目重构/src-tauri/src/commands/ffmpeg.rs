use std::process::Command;
use tauri::Emitter;
use crate::models::{FfmpegOptions, FfmpegResult, MediaInfo, VideoFile};

#[tauri::command]
pub async fn ffmpeg_execute(options: FfmpegOptions) -> Result<FfmpegResult, String> {
    let output = Command::new(&options.ffmpeg_path)
        .args(&options.args)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(FfmpegResult {
            success: true,
            output: Some(String::from_utf8_lossy(&output.stdout).to_string()),
            error: None,
        })
    } else {
        Ok(FfmpegResult {
            success: false,
            output: None,
            error: Some(String::from_utf8_lossy(&output.stderr).to_string()),
        })
    }
}

#[tauri::command]
pub async fn ffmpeg_execute_with_progress(
    options: FfmpegOptions,
    app: tauri::AppHandle,
) -> Result<FfmpegResult, String> {
    use std::io::{BufRead, BufReader};
    use std::process::{Command, Stdio};

    let mut child = Command::new(&options.ffmpeg_path)
        .args(&options.args)
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;
    let reader = BufReader::new(stderr);

    for line in reader.lines() {
        if let Ok(line) = line {
            let _ = app.emit("ffmpeg:log", &line);
        }
    }

    let status = child.wait().map_err(|e| e.to_string())?;

    if status.success() {
        Ok(FfmpegResult {
            success: true,
            output: None,
            error: None,
        })
    } else {
        Ok(FfmpegResult {
            success: false,
            output: None,
            error: Some("FFmpeg process failed".to_string()),
        })
    }
}

#[tauri::command]
pub async fn ffmpeg_stop() -> Result<bool, String> {
    Ok(true)
}

#[tauri::command]
pub async fn ffmpeg_get_media_info(
    ffprobe_path: String,
    file_path: String,
) -> Result<Option<MediaInfo>, String> {
    let output = Command::new(&ffprobe_path)
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            &file_path,
        ])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let json: serde_json::Value = serde_json::from_slice(&output.stdout)
            .map_err(|e| e.to_string())?;

        let format = json.get("format");
        let duration = format
            .and_then(|f| f.get("duration"))
            .and_then(|d| d.as_str())
            .and_then(|d| d.parse::<f64>().ok())
            .unwrap_or(0.0);

        let format_name = format
            .and_then(|f| f.get("format_name"))
            .and_then(|n| n.as_str())
            .unwrap_or("unknown")
            .to_string();

        let size = std::fs::metadata(&file_path)
            .map(|m| m.len())
            .unwrap_or(0);

        let mut video_info = None;
        let mut audio_info = None;

        if let Some(streams) = json.get("streams").and_then(|s| s.as_array()) {
            for stream in streams {
                let codec_type = stream.get("codec_type").and_then(|t| t.as_str());
                
                if codec_type == Some("video") && video_info.is_none() {
                    let fps = stream
                        .get("avg_frame_rate")
                        .and_then(|r| r.as_str())
                        .map(|r| parse_frame_rate(r))
                        .unwrap_or(0.0);

                    video_info = Some(crate::models::VideoInfo {
                        width: stream.get("width").and_then(|w| w.as_u64()).unwrap_or(0) as u32,
                        height: stream.get("height").and_then(|h| h.as_u64()).unwrap_or(0) as u32,
                        codec: stream.get("codec_name").and_then(|c| c.as_str()).unwrap_or("unknown").to_string(),
                        fps,
                        bitrate: stream.get("bit_rate").and_then(|b| b.as_str()).and_then(|b| b.parse().ok()).unwrap_or(0),
                    });
                } else if codec_type == Some("audio") && audio_info.is_none() {
                    audio_info = Some(crate::models::AudioInfo {
                        codec: stream.get("codec_name").and_then(|c| c.as_str()).unwrap_or("unknown").to_string(),
                        sample_rate: stream.get("sample_rate").and_then(|r| r.as_str()).and_then(|r| r.parse().ok()).unwrap_or(0),
                        channels: stream.get("channels").and_then(|c| c.as_u64()).unwrap_or(0) as u32,
                        bitrate: stream.get("bit_rate").and_then(|b| b.as_str()).and_then(|b| b.parse().ok()).unwrap_or(0),
                    });
                }
            }
        }

        Ok(Some(MediaInfo {
            duration,
            format: format_name,
            size,
            video: video_info,
            audio: audio_info,
        }))
    } else {
        Ok(None)
    }
}

fn parse_frame_rate(rate: &str) -> f32 {
    let parts: Vec<&str> = rate.split('/').collect();
    if parts.len() == 2 {
        let num: f32 = parts[0].parse().unwrap_or(0.0);
        let den: f32 = parts[1].parse().unwrap_or(1.0);
        num / den
    } else {
        rate.parse().unwrap_or(0.0)
    }
}

#[tauri::command]
pub async fn ffmpeg_validate_path(
    bin_path: String,
) -> Result<serde_json::Value, String> {
    use std::path::Path;

    let path = Path::new(&bin_path);
    let ffmpeg_path = path.join("ffmpeg.exe");
    let ffprobe_path = path.join("ffprobe.exe");

    let ffmpeg_exists = ffmpeg_path.exists();
    let ffprobe_exists = ffprobe_path.exists();

    if !ffmpeg_exists {
        return Ok(serde_json::json!({
            "valid": false,
            "ffmpegPath": "",
            "ffprobePath": "",
            "error": "ffmpeg.exe not found"
        }));
    }

    Ok(serde_json::json!({
        "valid": true,
        "ffmpegPath": ffmpeg_path.to_string_lossy(),
        "ffprobePath": if ffprobe_exists { ffprobe_path.to_string_lossy().to_string() } else { String::new() },
        "error": null
    }))
}

#[tauri::command]
pub async fn ffmpeg_check_global() -> Result<serde_json::Value, String> {
    use std::process::Command;

    let ffmpeg_result = Command::new("ffmpeg")
        .arg("-version")
        .output();

    let ffprobe_result = Command::new("ffprobe")
        .arg("-version")
        .output();

    let ffmpeg_available = ffmpeg_result.is_ok() && ffmpeg_result.unwrap().status.success();
    let ffprobe_available = ffprobe_result.is_ok() && ffprobe_result.unwrap().status.success();

    Ok(serde_json::json!({
        "available": ffmpeg_available,
        "ffmpegAvailable": ffmpeg_available,
        "ffprobeAvailable": ffprobe_available,
        "ffmpegPath": if ffmpeg_available { "ffmpeg".to_string() } else { String::new() },
        "ffprobePath": if ffprobe_available { "ffprobe".to_string() } else { String::new() }
    }))
}

#[tauri::command]
pub async fn ffmpeg_scan_folder_videos(
    ffprobe_path: String,
    folder_path: String,
    app: tauri::AppHandle,
) -> Result<serde_json::Value, String> {
    use walkdir::WalkDir;

    let video_extensions = [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v", ".ts", ".mts", ".m2ts", ".ogv", ".3gp", ".f4v"];
    let mut videos: Vec<VideoFile> = Vec::new();
    let mut total_size = 0u64;

    for entry in WalkDir::new(&folder_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() {
            let ext = path.extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase());

            if let Some(ext) = ext {
                let ext_with_dot = format!(".{}", ext);
                if video_extensions.contains(&ext_with_dot.as_str()) {
                    if let Ok(metadata) = std::fs::metadata(path) {
                        let size = metadata.len();
                        total_size += size;

                        videos.push(VideoFile {
                            path: path.to_string_lossy().to_string(),
                            name: path.file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("unknown")
                                .to_string(),
                            size,
                            duration: 0.0,
                            width: 0,
                            height: 0,
                            codec: String::new(),
                            fps: 0.0,
                            bitrate: 0,
                        });
                    }
                }
            }
        }
    }

    let total = videos.len();
    for (i, video) in videos.iter_mut().enumerate() {
        if let Ok(Some(info)) = ffmpeg_get_media_info(ffprobe_path.clone(), video.path.clone()).await {
            video.duration = info.duration;
            video.width = info.video.as_ref().map(|v| v.width).unwrap_or(0);
            video.height = info.video.as_ref().map(|v| v.height).unwrap_or(0);
            video.codec = info.video.as_ref().map(|v| v.codec.clone()).unwrap_or_default();
            video.fps = info.video.as_ref().map(|v| v.fps).unwrap_or(0.0);
            video.bitrate = info.video.as_ref().map(|v| v.bitrate).unwrap_or(0);
        }

        let progress = ((i + 1) as f64 / total as f64 * 100.0) as u32;
        let _ = app.emit("ffmpeg:progress", serde_json::json!({ "progress": progress }));
    }

    Ok(serde_json::json!({
        "videos": videos,
        "totalCount": total,
        "totalSize": total_size
    }))
}

#[tauri::command]
pub async fn ffmpeg_merge_videos(
    ffmpeg_path: String,
    folder_path: String,
    output_name: String,
    overwrite: bool,
) -> Result<serde_json::Value, String> {
    use std::fs;
    use std::process::Command;

    let video_extensions = [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"];
    let mut video_files: Vec<String> = Vec::new();

    for entry in fs::read_dir(&folder_path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_file() {
            let ext = path.extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase());

            if let Some(ext) = ext {
                if video_extensions.contains(&ext.as_str()) {
                    video_files.push(path.to_string_lossy().to_string());
                }
            }
        }
    }

    if video_files.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "error": "文件夹中没有视频文件"
        }));
    }

    video_files.sort();

    let output_path = std::path::Path::new(&folder_path).join(&output_name);

    if output_path.exists() && !overwrite {
        return Ok(serde_json::json!({
            "success": false,
            "error": "输出文件已存在"
        }));
    }

    let list_file = std::path::Path::new(&folder_path).join("filelist.txt");
    let list_content: String = video_files
        .iter()
        .map(|f| format!("file '{}'", f.replace('\'', "'\\''")))
        .collect::<Vec<_>>()
        .join("\n");

    fs::write(&list_file, list_content).map_err(|e| e.to_string())?;

    let result = Command::new(&ffmpeg_path)
        .args([
            "-f", "concat",
            "-safe", "0",
            "-i", &list_file.to_string_lossy(),
            "-c", "copy",
            "-y",
            &output_path.to_string_lossy(),
        ])
        .output();

    fs::remove_file(&list_file).ok();

    match result {
        Ok(output) => {
            if output.status.success() {
                Ok(serde_json::json!({
                    "success": true,
                    "outputPath": output_path.to_string_lossy().to_string()
                }))
            } else {
                Ok(serde_json::json!({
                    "success": false,
                    "error": String::from_utf8_lossy(&output.stderr).to_string()
                }))
            }
        }
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "error": e.to_string()
        })),
    }
}

#[tauri::command]
pub async fn ffmpeg_classify_by_fps(
    ffprobe_path: String,
    folder_path: String,
    app: tauri::AppHandle,
) -> Result<serde_json::Value, String> {
    use std::fs;
    use std::path::Path;
    use walkdir::WalkDir;

    let video_extensions = [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v", ".ts", ".mts", ".m2ts", ".ogv", ".3gp", ".f4v"];
    let mut video_files: Vec<(String, f32)> = Vec::new();

    for entry in WalkDir::new(&folder_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() {
            let ext = path.extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase());

            if let Some(ext) = ext {
                let ext_with_dot = format!(".{}", ext);
                if video_extensions.contains(&ext_with_dot.as_str()) {
                    let path_str = path.to_string_lossy().to_string();
                    
                    if let Ok(Some(info)) = ffmpeg_get_media_info(ffprobe_path.clone(), path_str.clone()).await {
                        let fps = info.video.as_ref().map(|v| v.fps).unwrap_or(0.0);
                        if fps > 0.0 {
                            video_files.push((path_str, fps));
                        }
                    }
                }
            }
        }
    }

    let total = video_files.len();
    let mut classified_count = 0;
    let mut folders: Vec<String> = Vec::new();

    for (i, (video_path, fps)) in video_files.iter().enumerate() {
        let fps_int = fps.round() as i32;
        let folder_name = format!("FPS_{}", fps_int);
        let target_folder = Path::new(&folder_path).join(&folder_name);

        if !target_folder.exists() {
            fs::create_dir_all(&target_folder).map_err(|e| e.to_string())?;
            if !folders.contains(&folder_name) {
                folders.push(folder_name.clone());
            }
        }

        let source_path = Path::new(video_path);
        if let Some(file_name) = source_path.file_name() {
            let dest_path = target_folder.join(file_name);
            
            if source_path != dest_path {
                if let Err(e) = fs::rename(source_path, &dest_path) {
                    eprintln!("Failed to move {}: {}", video_path, e);
                } else {
                    classified_count += 1;
                }
            }
        }

        let progress = ((i + 1) as f64 / total as f64 * 100.0) as u32;
        let _ = app.emit("ffmpeg:progress", serde_json::json!({ "progress": progress }));
    }

    Ok(serde_json::json!({
        "success": true,
        "classifiedCount": classified_count,
        "folders": folders
    }))
}

#[tauri::command]
pub async fn ffmpeg_collect_subfolder_videos(
    folder_path: String,
) -> Result<serde_json::Value, String> {
    use std::fs;
    use std::path::Path;
    use walkdir::WalkDir;

    let video_extensions = [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v", ".ts", ".mts", ".m2ts", ".ogv", ".3gp", ".f4v"];
    let root_path = Path::new(&folder_path);
    let mut collected_count = 0;

    let mut video_files: Vec<std::path::PathBuf> = Vec::new();

    for entry in WalkDir::new(&folder_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() {
            let parent = path.parent();
            if parent == Some(root_path) {
                continue;
            }

            let ext = path.extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase());

            if let Some(ext) = ext {
                let ext_with_dot = format!(".{}", ext);
                if video_extensions.contains(&ext_with_dot.as_str()) {
                    video_files.push(path.to_path_buf());
                }
            }
        }
    }

    for video_path in video_files {
        if let Some(file_name) = video_path.file_name() {
            let dest_path = root_path.join(file_name);
            
            if video_path != dest_path {
                let final_dest = if dest_path.exists() {
                    let stem = dest_path.file_stem().and_then(|s| s.to_str()).unwrap_or("video");
                    let ext = dest_path.extension().and_then(|e| e.to_str()).unwrap_or("mp4");
                    let mut counter = 1;
                    loop {
                        let new_name = format!("{}_{}.{}", stem, counter, ext);
                        let new_path = root_path.join(&new_name);
                        if !new_path.exists() {
                            break new_path;
                        }
                        counter += 1;
                    }
                } else {
                    dest_path
                };

                if let Err(e) = fs::rename(&video_path, &final_dest) {
                    eprintln!("Failed to move {:?} to {:?}: {}", video_path, final_dest, e);
                } else {
                    collected_count += 1;
                }
            }
        }
    }

    Ok(serde_json::json!({
        "success": true,
        "collectedCount": collected_count
    }))
}

#[tauri::command]
pub async fn ffmpeg_extract_frame(
    ffmpeg_path: String,
    video_path: String,
    timestamp: f64,
) -> Result<String, String> {
    use std::process::Command;
    use base64::{engine::general_purpose, Engine as _};
    
    let temp_dir = std::env::temp_dir();
    let output_file = temp_dir.join(format!("frame_{}.jpg", uuid::Uuid::new_v4()));
    
    let timestamp_str = format!("{:.2}", timestamp);
    
    let output = Command::new(&ffmpeg_path)
        .args([
            "-ss", &timestamp_str,
            "-i", &video_path,
            "-vframes", "1",
            "-q:v", "2",
            "-f", "image2",
            output_file.to_str().unwrap(),
            "-y",
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    let image_data = std::fs::read(&output_file).map_err(|e| format!("Failed to read frame: {}", e))?;
    
    let _ = std::fs::remove_file(&output_file);
    
    let base64_str = general_purpose::STANDARD.encode(&image_data);
    
    Ok(format!("data:image/jpeg;base64,{}", base64_str))
}
