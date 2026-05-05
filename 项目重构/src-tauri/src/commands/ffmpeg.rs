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
pub async fn ffmpeg_scan_folder_videos(
    ffprobe_path: String,
    folder_path: String,
    app: tauri::AppHandle,
) -> Result<serde_json::Value, String> {
    use walkdir::WalkDir;

    let video_extensions = [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"];
    let mut videos: Vec<VideoFile> = Vec::new();
    let mut total_size = 0u64;

    for entry in WalkDir::new(&folder_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() {
            let ext = path.extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase());

            if let Some(ext) = ext {
                if video_extensions.contains(&ext.as_str()) {
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
