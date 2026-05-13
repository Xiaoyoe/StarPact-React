use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::net::SocketAddr;
use serde::{Deserialize, Serialize};

static SERVER_RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanServerInfo {
    pub running: bool,
    pub address: String,
    pub port: u16,
}

#[tauri::command]
pub async fn start_lan_server(port: u16) -> Result<LanServerInfo, String> {
    if SERVER_RUNNING.load(Ordering::SeqCst) {
        return Err("Server is already running".to_string());
    }
    
    let local_ip = local_ip_address::local_ip()
        .map_err(|e| format!("Failed to get local IP: {}", e))?;
    
    let addr: SocketAddr = format!("0.0.0.0:{}", port)
        .parse()
        .map_err(|e| format!("Invalid address: {}", e))?;
    
    SERVER_RUNNING.store(true, Ordering::SeqCst);
    
    let running = Arc::new(AtomicBool::new(true));
    let running_clone = running.clone();
    
    tokio::spawn(async move {
        use axum::{
            Router,
            response::{Json, IntoResponse, Html},
            http::StatusCode,
        };
        use tower_http::cors::{CorsLayer, Any};
        
        let data_dir = crate::services::storage::paths::get_data_dir();
        let images_dir = data_dir.join("images");
        let thumbnails_dir = images_dir.join("thumbnails");
        let videos_dir = data_dir.join("videos");
        
        let cors = CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);
        
        async fn get_index() -> impl IntoResponse {
            Html(get_html_page())
        }
        
        async fn get_image(
            axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
        ) -> impl IntoResponse {
            use axum::body::Body;
            use axum::http::{header, StatusCode};
            
            if let Some(path) = params.get("path") {
                match tokio::fs::read(path).await {
                    Ok(bytes) => {
                        let mime = match path.rsplit('.').next() {
                            Some("jpg") | Some("jpeg") => "image/jpeg",
                            Some("png") => "image/png",
                            Some("gif") => "image/gif",
                            Some("webp") => "image/webp",
                            Some("bmp") => "image/bmp",
                            _ => "application/octet-stream",
                        };
                        (
                            [(header::CONTENT_TYPE, mime)],
                            Body::from(bytes),
                        ).into_response()
                    }
                    Err(_) => (StatusCode::NOT_FOUND, "Image not found").into_response(),
                }
            } else {
                (StatusCode::BAD_REQUEST, "Missing path parameter").into_response()
            }
        }
        
        async fn get_video(
            axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
            headers: axum::http::HeaderMap,
        ) -> impl IntoResponse {
            use axum::body::Body;
            use axum::http::{header, StatusCode, Response};
            
            if let Some(path) = params.get("path") {
                match tokio::fs::File::open(path).await {
                    Ok(mut file) => {
                        let metadata = match file.metadata().await {
                            Ok(m) => m,
                            Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get metadata").into_response(),
                        };
                        let file_size = metadata.len();
                        
                        let mime = match path.rsplit('.').next() {
                            Some("mp4") => "video/mp4",
                            Some("webm") => "video/webm",
                            Some("mkv") => "video/x-matroska",
                            Some("avi") => "video/x-msvideo",
                            Some("mov") => "video/quicktime",
                            Some("m4v") => "video/mp4",
                            _ => "video/mp4",
                        };
                        
                        if let Some(range_header) = headers.get(header::RANGE) {
                            let range_str = range_header.to_str().unwrap_or("");
                            if let Some(range) = parse_range(range_str, file_size) {
                                use tokio::io::AsyncSeekExt;
                                if let Err(_) = file.seek(std::io::SeekFrom::Start(range.start)).await {
                                    return (StatusCode::INTERNAL_SERVER_ERROR, "Seek failed").into_response();
                                }
                                
                                let mut buffer = vec![0u8; (range.end - range.start + 1) as usize];
                                if let Err(_) = tokio::io::AsyncReadExt::read_exact(&mut file, &mut buffer).await {
                                    return (StatusCode::INTERNAL_SERVER_ERROR, "Read failed").into_response();
                                }
                                
                                let content_range = format!("bytes {}-{}/{}", range.start, range.end, file_size);
                                let content_len = (range.end - range.start + 1).to_string();
                                
                                let mut response = Response::new(Body::from(buffer));
                                *response.status_mut() = StatusCode::PARTIAL_CONTENT;
                                response.headers_mut().insert(header::CONTENT_TYPE, mime.parse().unwrap());
                                response.headers_mut().insert(header::CONTENT_LENGTH, content_len.parse().unwrap());
                                response.headers_mut().insert(header::ACCEPT_RANGES, "bytes".parse().unwrap());
                                response.headers_mut().insert(header::CONTENT_RANGE, content_range.parse().unwrap());
                                return response.into_response();
                            }
                        }
                        
                        match tokio::fs::read(path).await {
                            Ok(bytes) => {
                                let mut response = Response::new(Body::from(bytes));
                                *response.status_mut() = StatusCode::OK;
                                response.headers_mut().insert(header::CONTENT_TYPE, mime.parse().unwrap());
                                response.headers_mut().insert(header::CONTENT_LENGTH, file_size.to_string().parse().unwrap());
                                response.headers_mut().insert(header::ACCEPT_RANGES, "bytes".parse().unwrap());
                                response.into_response()
                            }
                            Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Read failed").into_response()
                        }
                    }
                    Err(_) => (StatusCode::NOT_FOUND, "Video not found").into_response(),
                }
            } else {
                (StatusCode::BAD_REQUEST, "Missing path parameter").into_response()
            }
        }
        
        fn parse_range(range_str: &str, file_size: u64) -> Option<std::ops::Range<u64>> {
            if !range_str.starts_with("bytes=") {
                return None;
            }
            let range_part = &range_str[6..];
            let parts: Vec<&str> = range_part.split('-').collect();
            if parts.len() != 2 {
                return None;
            }
            let start: u64 = parts[0].parse().ok()?;
            let end: u64 = if parts[1].is_empty() {
                file_size - 1
            } else {
                parts[1].parse().ok()?
            };
            Some(start..end.min(file_size - 1))
        }
        
        async fn get_images() -> impl IntoResponse {
            let db = crate::services::storage::database::get_database();
            match db.get_all_images() {
                Ok(images) => Json(images).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("{{\"error\": \"{}\"}}", e)).into_response(),
            }
        }
        
        async fn get_albums() -> impl IntoResponse {
            let db = crate::services::storage::database::get_database();
            match db.get_albums() {
                Ok(albums) => Json(albums).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("{{\"error\": \"{}\"}}", e)).into_response(),
            }
        }
        
        async fn get_videos() -> impl IntoResponse {
            use serde::{Deserialize, Serialize};
            
            #[derive(Debug, Clone, Serialize, Deserialize)]
            struct VideoPlaylist {
                id: String,
                name: String,
                videos: Vec<VideoItemJson>,
                created_at: u64,
                updated_at: u64,
            }
            
            #[derive(Debug, Clone, Serialize, Deserialize)]
            struct VideoItemJson {
                id: String,
                name: String,
                path: String,
                size: u64,
                duration: f64,
                added_at: u64,
                thumbnail: Option<String>,
            }
            
            let data_dir = crate::services::storage::paths::get_data_dir();
            let json_path = data_dir.join("video_playlists.json");
            
            if !json_path.exists() {
                return Json(Vec::<VideoItemJson>::new()).into_response();
            }
            
            match tokio::fs::read_to_string(&json_path).await {
                Ok(content) => {
                    match serde_json::from_str::<Vec<VideoPlaylist>>(&content) {
                        Ok(playlists) => {
                            let all_videos: Vec<VideoItemJson> = playlists
                                .into_iter()
                                .flat_map(|p| p.videos)
                                .filter(|v| {
                                    !v.path.starts_with("blob:") && !v.path.is_empty()
                                })
                                .collect();
                            Json(all_videos).into_response()
                        }
                        Err(e) => {
                            (StatusCode::INTERNAL_SERVER_ERROR, format!("{{\"error\": \"Parse error: {}\"}}", e)).into_response()
                        }
                    }
                }
                Err(e) => {
                    (StatusCode::INTERNAL_SERVER_ERROR, format!("{{\"error\": \"Read error: {}\"}}", e)).into_response()
                }
            }
        }
        
        async fn get_multi_layouts() -> impl IntoResponse {
            use serde::{Deserialize, Serialize};
            
            #[derive(Debug, Clone, Serialize, Deserialize)]
            struct LayoutVideo {
                video_id: String,
                x: f32,
                y: f32,
                width: f32,
                height: f32,
                z_index: i32,
                opacity: f32,
                volume: f32,
                muted: bool,
            }
            
            #[derive(Debug, Clone, Serialize, Deserialize)]
            struct MultiVideoLayout {
                id: String,
                name: String,
                videos: Vec<LayoutVideo>,
                grid_columns: u32,
                grid_rows: u32,
            }
            
            let data_dir = crate::services::storage::paths::get_data_dir();
            let json_path = data_dir.join("multi_video_layouts.json");
            
            if !json_path.exists() {
                return Json(Vec::<MultiVideoLayout>::new()).into_response();
            }
            
            match tokio::fs::read_to_string(&json_path).await {
                Ok(content) => {
                    match serde_json::from_str::<Vec<MultiVideoLayout>>(&content) {
                        Ok(layouts) => Json(layouts).into_response(),
                        Err(e) => {
                            (StatusCode::INTERNAL_SERVER_ERROR, format!("{{\"error\": \"Parse error: {}\"}}", e)).into_response()
                        }
                    }
                }
                Err(e) => {
                    (StatusCode::INTERNAL_SERVER_ERROR, format!("{{\"error\": \"Read error: {}\"}}", e)).into_response()
                }
            }
        }
        
        let app_router = Router::new()
            .route("/", axum::routing::get(get_index))
            .route("/api/images", axum::routing::get(get_images))
            .route("/api/albums", axum::routing::get(get_albums))
            .route("/api/videos", axum::routing::get(get_videos))
            .route("/api/image", axum::routing::get(get_image))
            .route("/api/video", axum::routing::get(get_video))
            .route("/api/multi-layouts", axum::routing::get(get_multi_layouts))
            .nest_service("/images", tower_http::services::ServeDir::new(&images_dir))
            .nest_service("/thumbnails", tower_http::services::ServeDir::new(&thumbnails_dir))
            .nest_service("/videos", tower_http::services::ServeDir::new(&videos_dir))
            .layer(cors);
        
        let listener = match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => l,
            Err(_e) => {
                SERVER_RUNNING.store(false, Ordering::SeqCst);
                return;
            }
        };
        
        axum::serve(listener, app_router)
            .with_graceful_shutdown(async move {
                while running_clone.load(Ordering::SeqCst) {
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                }
            })
            .await
            .ok();
    });
    
    Ok(LanServerInfo {
        running: true,
        address: format!("http://{}:{}", local_ip, port),
        port,
    })
}

#[tauri::command]
pub async fn stop_lan_server() -> Result<LanServerInfo, String> {
    if !SERVER_RUNNING.load(Ordering::SeqCst) {
        return Err("Server is not running".to_string());
    }
    
    SERVER_RUNNING.store(false, Ordering::SeqCst);
    
    let local_ip = local_ip_address::local_ip()
        .map_err(|e| format!("Failed to get local IP: {}", e))?;
    
    Ok(LanServerInfo {
        running: false,
        address: format!("http://{}:8080", local_ip),
        port: 8080,
    })
}

#[tauri::command]
pub async fn get_lan_server_status() -> Result<LanServerInfo, String> {
    let local_ip = local_ip_address::local_ip()
        .map_err(|e| format!("Failed to get local IP: {}", e))?;
    
    Ok(LanServerInfo {
        running: SERVER_RUNNING.load(Ordering::SeqCst),
        address: format!("http://{}:8080", local_ip),
        port: 8080,
    })
}

fn get_html_page() -> String {
    r#"<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Starpact 媒体中心</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f0f1a;
            min-height: 100vh;
            overflow-x: hidden;
        }
        
        /* 欢迎页面 - 简洁纯色 */
        .welcome {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #1a1a2e;
            padding: 20px;
        }
        .welcome-logo {
            width: 80px;
            height: 80px;
            background: #667eea;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            margin-bottom: 20px;
        }
        .welcome h1 { color: white; font-size: 24px; margin-bottom: 6px; font-weight: 600; }
        .welcome p { color: rgba(255,255,255,0.5); font-size: 13px; margin-bottom: 36px; }
        .welcome-cards { display: flex; gap: 12px; }
        .welcome-card {
            width: 130px;
            padding: 20px 16px;
            background: #252542;
            border-radius: 12px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .welcome-card:hover { background: #2d2d52; transform: translateY(-4px); }
        .welcome-card-icon { font-size: 36px; margin-bottom: 10px; }
        .welcome-card-title { color: white; font-size: 14px; font-weight: 500; }
        
        /* 图片页面 */
        .image-page { display: none; min-height: 100vh; background: #f5f5f5; }
        .image-page.active { display: block; }
        .page-header {
            background: #1a1a2e;
            color: white;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .back-btn {
            background: transparent;
            border: none;
            color: rgba(255,255,255,0.7);
            padding: 0;
            cursor: pointer;
            font-size: 24px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
        }
        .back-btn:hover { color: white; }
        .page-title { font-size: 17px; font-weight: 500; }
        
        .content { padding: 16px; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 12px;
        }
        .card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            cursor: pointer;
            transition: transform 0.2s;
        }
        .card:hover { transform: translateY(-4px); }
        .card-img {
            width: 100%;
            aspect-ratio: 1;
            object-fit: cover;
            background: #eee;
        }
        .card-name {
            padding: 8px;
            font-size: 12px;
            color: #333;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        /* 图片查看器 - 独立页面 */
        .viewer-page {
            display: none;
            position: fixed;
            inset: 0;
            background: #0a0a0f;
            z-index: 100;
            flex-direction: column;
        }
        .viewer-page.active { display: flex; }
        .viewer-header {
            background: rgba(0,0,0,0.6);
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .viewer-title {
            color: white;
            font-size: 14px;
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .viewer-content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            touch-action: manipulation;
        }
        .viewer-content img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            transition: transform 0.3s;
            cursor: zoom-in;
        }
        .viewer-content img.zoomed {
            cursor: zoom-out;
        }
        .viewer-footer {
            background: rgba(0,0,0,0.6);
            padding: 16px 24px 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
        }
        .viewer-btn {
            width: 50px;
            height: 50px;
            background: rgba(255,255,255,0.15);
            border: none;
            border-radius: 50%;
            color: white;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        .viewer-btn:hover { background: rgba(255,255,255,0.25); }
        .viewer-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .viewer-counter {
            color: rgba(255,255,255,0.6);
            font-size: 13px;
            min-width: 60px;
            text-align: center;
        }
        
        /* 加载更多按钮 */
        .load-more {
            display: block;
            width: 100%;
            padding: 16px;
            background: #252542;
            border: none;
            color: white;
            font-size: 14px;
            cursor: pointer;
            margin-top: 12px;
            border-radius: 8px;
        }
        .load-more:hover { background: #2d2d52; }
        .load-more:disabled { opacity: 0.5; cursor: not-allowed; }
        
        /* 视频页面 - 播放器布局 */
        .video-page { display: none; min-height: 100vh; background: #0f0f1a; }
        .video-page.active { display: flex; flex-direction: column; }
        
        .video-header {
            background: #1a1a2e;
            padding: 10px 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .video-header-title {
            flex: 1;
            overflow: hidden;
            white-space: nowrap;
        }
        .video-header-title-inner {
            display: inline-block;
            color: white;
            font-size: 14px;
            font-weight: 500;
        }
        .video-header-title-inner.scroll {
            animation: scrollText 8s linear infinite;
        }
        @keyframes scrollText {
            0% { transform: translateX(0); }
            10% { transform: translateX(0); }
            90% { transform: translateX(-100%); }
            100% { transform: translateX(-100%); }
        }
        
        /* 视频切换按钮 */
        .video-nav-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .video-nav-btn:hover { background: rgba(255,255,255,0.2); }
        .video-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        
        .video-player-area {
            background: #000;
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        .video-player-area video {
            width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .video-placeholder {
            color: rgba(255,255,255,0.4);
            text-align: center;
        }
        .video-placeholder-icon { font-size: 60px; margin-bottom: 12px; }
        
        /* 播放列表按钮 - 顶部右侧 */
        .playlist-toggle {
            background: rgba(255,255,255,0.15);
            border: none;
            color: white;
            padding: 6px 12px;
            border-radius: 16px;
            cursor: pointer;
            font-size: 13px;
            display: none;
            align-items: center;
            gap: 6px;
        }
        .playlist-toggle.active { display: flex; }
        .playlist-toggle .badge {
            background: #ff4757;
            border-radius: 10px;
            font-size: 10px;
            padding: 2px 6px;
            min-width: 18px;
            text-align: center;
        }
        
        /* 播放列表悬浮窗 */
        .playlist-panel {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            height: 0;
            background: #1a1a2e;
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
            z-index: 60;
            transition: height 0.3s ease;
            overflow: hidden;
        }
        .playlist-panel.active { height: 35vh; }
        .playlist-panel-header {
            padding: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .playlist-panel-title { color: white; font-size: 16px; font-weight: 500; }
        .playlist-close {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
        }
        .playlist {
            height: calc(35vh - 60px);
            overflow-y: auto;
            padding: 8px 16px;
        }
        .playlist-item {
            display: flex;
            gap: 12px;
            padding: 10px;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
            margin-bottom: 4px;
        }
        .playlist-item:hover { background: rgba(255,255,255,0.05); }
        .playlist-item.active { background: rgba(102,126,234,0.2); }
        .playlist-thumb {
            width: 80px;
            height: 45px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 6px;
            flex-shrink: 0;
            overflow: hidden;
            position: relative;
        }
        .playlist-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .playlist-thumb-icon {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            background: rgba(0,0,0,0.3);
        }
        .playlist-info { flex: 1; min-width: 0; padding-top: 2px; }
        .playlist-name {
            color: white;
            font-size: 13px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 4px;
        }
        .playlist-meta { color: rgba(255,255,255,0.4); font-size: 11px; }
        
        /* 多视频播放页面 */
        .multi-page { display: none; min-height: 100vh; background: #0f0f1a; }
        .multi-page.active { display: flex; flex-direction: column; }
        .multi-header {
            background: #1a1a2e;
            padding: 10px 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .multi-header-title { color: white; font-size: 16px; flex: 1; }
        .multi-grid-select {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .multi-grid-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
        }
        .multi-grid-btn.active { background: #667eea; }
        .multi-content {
            flex: 1;
            display: grid;
            gap: 4px;
            padding: 4px;
            overflow: hidden;
        }
        .multi-video-cell {
            background: #000;
            border-radius: 4px;
            overflow: hidden;
            position: relative;
        }
        .multi-video-cell video {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        .multi-video-name {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(0,0,0,0.6);
            color: white;
            font-size: 10px;
            padding: 4px 6px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            z-index: 1;
            pointer-events: none;
        }
        .multi-add-btn {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(102,126,234,0.8);
            border: none;
            color: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
        }
        .multi-controls {
            background: #1a1a2e;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
        }
        .multi-control-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .multi-control-btn:hover { background: rgba(255,255,255,0.2); }
        
        /* 视频选择面板 */
        .video-selector {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.8);
            z-index: 9999;
            align-items: center;
            justify-content: center;
        }
        .video-selector.active { display: flex; }
        .video-selector-panel {
            background: #1a1a2e;
            border-radius: 16px;
            width: 90%;
            max-width: 400px;
            max-height: 70vh;
            display: flex;
            flex-direction: column;
        }
        .video-selector-header {
            padding: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .video-selector-title { color: white; font-size: 16px; font-weight: 500; }
        .video-selector-close {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
        }
        .video-selector-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }
        .video-selector-item {
            display: flex;
            gap: 12px;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
            margin-bottom: 4px;
        }
        .video-selector-item:hover { background: rgba(255,255,255,0.1); }
        .video-selector-thumb {
            width: 60px;
            height: 34px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 4px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
        }
        .video-selector-info { flex: 1; min-width: 0; }
        .video-selector-name {
            color: white;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 4px;
        }
        .video-selector-meta { color: rgba(255,255,255,0.4); font-size: 12px; }
        
        .empty { text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.4); }
    </style>
</head>
<body>
    <!-- 欢迎页面 -->
    <div class="welcome" id="welcome">
        <div class="welcome-logo">🌟</div>
        <h1>Starpact 媒体中心</h1>
        <p>选择要浏览的内容</p>
        <div class="welcome-cards">
            <div class="welcome-card" onclick="openImagePage()">
                <div class="welcome-card-icon">📷</div>
                <div class="welcome-card-title">图片库</div>
            </div>
            <div class="welcome-card" onclick="openVideoPage()">
                <div class="welcome-card-icon">🎬</div>
                <div class="welcome-card-title">视频库</div>
            </div>
        </div>
        <div class="welcome-cards" style="margin-top: 12px;">
            <div class="welcome-card" onclick="openMultiVideoPage()">
                <div class="welcome-card-icon">📺</div>
                <div class="welcome-card-title">多视频播放</div>
            </div>
        </div>
    </div>
    
    <!-- 图片页面 -->
    <div class="image-page" id="imagePage">
        <div class="page-header">
            <button class="back-btn" onclick="goHome()">‹</button>
            <span class="page-title">📷 图片管理</span>
        </div>
        <div class="content">
            <div class="grid" id="imageGrid"></div>
            <button class="load-more" id="loadMoreImages" style="display:none;" onclick="loadMoreImages()">
                加载更多图片
            </button>
        </div>
    </div>
    
    <!-- 图片查看器 - 独立页面 -->
    <div class="viewer-page" id="viewerPage">
        <div class="viewer-header">
            <button class="back-btn" onclick="closeViewer()">‹</button>
            <span class="viewer-title" id="viewerTitle">图片预览</span>
        </div>
        <div class="viewer-content">
            <img id="viewerImg" src="" alt="">
        </div>
        <div class="viewer-footer">
            <button class="viewer-btn" id="prevBtn" onclick="prevImage()">‹</button>
            <span class="viewer-counter" id="viewerCounter">1 / 1</span>
            <button class="viewer-btn" onclick="rotateImage()">↻</button>
            <button class="viewer-btn" id="nextBtn" onclick="nextImage()">›</button>
        </div>
    </div>
    
    <!-- 视频页面 -->
    <div class="video-page" id="videoPage">
        <div class="video-header">
            <button class="back-btn" onclick="goHome()">‹</button>
            <div class="video-header-title">
                <span class="video-header-title-inner" id="videoHeaderTitle">🎬 视频播放器</span>
            </div>
            <button class="video-nav-btn" id="prevVideoBtn" onclick="prevVideo()">‹</button>
            <button class="video-nav-btn" id="nextVideoBtn" onclick="nextVideo()">›</button>
            <button class="playlist-toggle" id="playlistToggle" onclick="togglePlaylist()">
                📋
                <span class="badge" id="playlistBadge">0</span>
            </button>
        </div>
        <div class="video-player-area">
            <video id="mainVideo" controls></video>
            <div class="video-placeholder" id="videoPlaceholder">
                <div class="video-placeholder-icon">🎬</div>
                <div>选择视频开始播放</div>
            </div>
        </div>
    </div>
    
    <!-- 播放列表悬浮窗 -->
    <div class="playlist-panel" id="playlistPanel">
        <div class="playlist-panel-header">
            <span class="playlist-panel-title">播放列表</span>
            <button class="playlist-close" onclick="togglePlaylist()">×</button>
        </div>
        <div class="playlist" id="playlist"></div>
    </div>
    
    <!-- 多视频播放页面 -->
    <div class="multi-page" id="multiPage">
        <div class="multi-header">
            <button class="back-btn" onclick="goHome()">‹</button>
            <span class="multi-header-title">📺 多视频播放</span>
            <div class="multi-grid-select">
                <button class="multi-grid-btn" onclick="setMultiGrid(1, 1)">1×1</button>
                <button class="multi-grid-btn active" onclick="setMultiGrid(2, 1)">2×1</button>
                <button class="multi-grid-btn" onclick="setMultiGrid(2, 2)">2×2</button>
            </div>
        </div>
        <div class="multi-content" id="multiContent"></div>
        <div class="multi-controls">
            <button class="multi-control-btn" onclick="multiPlayAll()">▶ 全部播放</button>
            <button class="multi-control-btn" onclick="multiPauseAll()">⏸ 全部暂停</button>
            <button class="multi-control-btn" onclick="multiClearAll()">✕ 清空</button>
        </div>
    </div>
    
    <!-- 视频选择面板 -->
    <div class="video-selector" id="videoSelector">
        <div class="video-selector-panel">
            <div class="video-selector-header">
                <span class="video-selector-title">选择视频</span>
                <button class="video-selector-close" onclick="closeVideoSelector()">×</button>
            </div>
            <div class="video-selector-list" id="videoSelectorList"></div>
        </div>
    </div>

    <script>
        var images = [];
        var videos = [];
        var multiVideos = [];
        var multiGridCols = 2;
        var multiGridRows = 1;
        var currentSelectorIndex = -1;
        var currentImageIndex = 0;
        var currentVideoIndex = -1;
        var imageRotation = 0;
        var imagePage = 0;
        var videoPage = 0;
        var IMAGE_PAGE_SIZE = 50;
        var VIDEO_PAGE_SIZE = 30;
        
        // 路由管理
        function navigate(path, state) {
            history.pushState(state || {}, '', path);
            handleRoute(path, state);
        }
        
        function handleRoute(path, state) {
            hideAllPages();
            
            if (path === '/' || path === '') {
                document.getElementById('welcome').style.display = 'flex';
            } else if (path === '/images') {
                document.getElementById('imagePage').classList.add('active');
                if (state && state.page) imagePage = state.page;
                renderImages();
            } else if (path === '/videos') {
                document.getElementById('videoPage').classList.add('active');
                document.getElementById('playlistToggle').classList.add('active');
                if (state && state.page) videoPage = state.page;
                renderPlaylist();
                document.getElementById('prevVideoBtn').disabled = currentVideoIndex <= 0;
                document.getElementById('nextVideoBtn').disabled = currentVideoIndex < 0 || currentVideoIndex >= videos.length - 1;
            } else if (path === '/viewer') {
                document.getElementById('viewerPage').classList.add('active');
                if (state && state.index !== undefined) {
                    currentImageIndex = state.index;
                    imageRotation = 0;
                    imageZoomed = false;
                    showImage(currentImageIndex);
                }
            } else if (path === '/multi') {
                document.getElementById('multiPage').classList.add('active');
                renderMultiGrid();
            }
        }
        
        function hideAllPages() {
            document.getElementById('welcome').style.display = 'none';
            document.getElementById('imagePage').classList.remove('active');
            document.getElementById('videoPage').classList.remove('active');
            document.getElementById('viewerPage').classList.remove('active');
            document.getElementById('multiPage').classList.remove('active');
            document.getElementById('playlistToggle').classList.remove('active');
            document.getElementById('playlistPanel').classList.remove('active');
        }
        
        // 监听浏览器返回事件
        window.addEventListener('popstate', function(e) {
            var path = location.pathname;
            handleRoute(path, e.state);
        });
        
        async function loadData() {
            try {
                var imgRes = await fetch('/api/images');
                var vidRes = await fetch('/api/videos');
                var imgData = await imgRes.json();
                var vidData = await vidRes.json();
                images = Array.isArray(imgData) ? imgData : [];
                videos = Array.isArray(vidData) ? vidData : [];
            } catch (e) {
                console.error('Load error:', e);
            }
        }
        
        function goHome() {
            navigate('/', {});
            imagePage = 0;
            videoPage = 0;
        }
        
        function getFileName(path) {
            if (!path) return '';
            return path.replace(/\\\\/g, '/').replace(/\\/g, '/').split('/').pop() || '';
        }
        
        function getImageUrl(filePath) {
            if (!filePath) return '';
            if (filePath.includes('data') && filePath.includes('images')) {
                return '/images/' + getFileName(filePath);
            }
            return '/api/image?path=' + encodeURIComponent(filePath);
        }
        
        function getVideoUrl(filePath) {
            if (!filePath) return '';
            if (filePath.includes('data') && filePath.includes('videos')) {
                return '/videos/' + getFileName(filePath);
            }
            return '/api/video?path=' + encodeURIComponent(filePath);
        }
        
        // 图片页面 - 分页加载
        function openImagePage() {
            imagePage = 0;
            navigate('/images', { page: 0 });
        }
        
        function renderImages() {
            var grid = document.getElementById('imageGrid');
            if (images.length === 0) {
                grid.innerHTML = '<div class="empty">暂无图片</div>';
                document.getElementById('loadMoreImages').style.display = 'none';
                return;
            }
            
            var start = 0;
            var end = Math.min(IMAGE_PAGE_SIZE * (imagePage + 1), images.length);
            
            if (imagePage === 0) {
                grid.innerHTML = '';
            }
            
            for (var i = IMAGE_PAGE_SIZE * imagePage; i < end; i++) {
                var img = images[i];
                var fp = img.filePath || img.file_path || img.path || '';
                var tp = img.thumbnailPath || img.thumbnail_path || '';
                var thumb = tp ? getImageUrl(tp) : getImageUrl(fp);
                var name = img.name || getFileName(fp) || '未命名';
                
                var card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = '<img class="card-img" loading="lazy" alt="' + name + '">' +
                    '<div class="card-name">' + name + '</div>';
                var imgEl = card.querySelector('img');
                imgEl.src = thumb;
                imgEl.onerror = function() { this.src = getImageUrl(fp); };
                (function(idx) {
                    card.onclick = function() { openViewer(idx); };
                })(i);
                grid.appendChild(card);
            }
            
            var loadMoreBtn = document.getElementById('loadMoreImages');
            if (end < images.length) {
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.textContent = '加载更多 (' + (images.length - end) + ' 张剩余)';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
        
        function loadMoreImages() {
            imagePage++;
            renderImages();
        }
        
        // 图片查看器 - 独立页面
        function openViewer(index) {
            currentImageIndex = index;
            imageRotation = 0;
            imageZoomed = false;
            navigate('/viewer', { index: index });
        }
        
        function showImage(index) {
            currentImageIndex = index;
            var img = images[index];
            var fp = img.filePath || img.file_path || img.path || '';
            var name = img.name || getFileName(fp) || '未命名';
            
            var viewerImg = document.getElementById('viewerImg');
            viewerImg.src = getImageUrl(fp);
            viewerImg.classList.remove('zoomed');
            viewerImg.style.transform = 'rotate(' + imageRotation + 'deg) scale(1)';
            document.getElementById('viewerTitle').textContent = name;
            document.getElementById('viewerCounter').textContent = (index + 1) + ' / ' + images.length;
            document.getElementById('prevBtn').disabled = index === 0;
            document.getElementById('nextBtn').disabled = index === images.length - 1;
        }
        
        function prevImage() {
            if (currentImageIndex > 0) {
                imageRotation = 0;
                imageZoomed = false;
                showImage(currentImageIndex - 1);
            }
        }
        
        function nextImage() {
            if (currentImageIndex < images.length - 1) {
                imageRotation = 0;
                imageZoomed = false;
                showImage(currentImageIndex + 1);
            }
        }
        
        function rotateImage() {
            imageRotation = (imageRotation + 90) % 360;
            updateImageTransform();
        }
        
        var imageZoomed = false;
        
        function toggleZoom() {
            imageZoomed = !imageZoomed;
            var img = document.getElementById('viewerImg');
            if (imageZoomed) {
                img.classList.add('zoomed');
            } else {
                img.classList.remove('zoomed');
            }
            updateImageTransform();
        }
        
        function updateImageTransform() {
            var img = document.getElementById('viewerImg');
            var scale = imageZoomed ? 2 : 1;
            img.style.transform = 'rotate(' + imageRotation + 'deg) scale(' + scale + ')';
        }
        
        function closeViewer() {
            history.back();
            imageZoomed = false;
        }
        
        // 视频页面 - 分页加载
        function openVideoPage() {
            videoPage = 0;
            currentVideoIndex = -1;
            navigate('/videos', { page: 0 });
        }
        
        function togglePlaylist() {
            var panel = document.getElementById('playlistPanel');
            // 如果打开播放列表且未选择视频，自动播放第一个
            if (!panel.classList.contains('active') && currentVideoIndex < 0 && videos.length > 0) {
                playVideo(0);
            }
            panel.classList.toggle('active');
        }
        
        function renderPlaylist() {
            var list = document.getElementById('playlist');
            if (videos.length === 0) {
                list.innerHTML = '<div class="empty">暂无视频</div>';
                document.getElementById('playlistBadge').textContent = '0';
                return;
            }
            
            var end = Math.min(VIDEO_PAGE_SIZE * (videoPage + 1), videos.length);
            
            if (videoPage === 0) {
                list.innerHTML = '';
            }
            
            for (var i = VIDEO_PAGE_SIZE * videoPage; i < end; i++) {
                var video = videos[i];
                var fp = video.path || video.filePath || video.file_path || '';
                var name = video.name || getFileName(fp) || '未命名';
                var size = formatSize(video.size || 0);
                var dur = video.duration ? formatDuration(video.duration) : '';
                
                var item = document.createElement('div');
                item.className = 'playlist-item';
                item.dataset.index = i;
                item.dataset.path = fp;
                item.innerHTML = '<div class="playlist-thumb"><div class="playlist-thumb-icon">▶</div></div>' +
                    '<div class="playlist-info"><div class="playlist-name">' + name + '</div>' +
                    '<div class="playlist-meta">' + size + (dur ? ' · ' + dur : '') + '</div></div>';
                (function(idx) {
                    item.onclick = function() { playVideo(idx); };
                })(i);
                list.appendChild(item);
            }
            
            // 加载更多视频按钮
            var loadMoreItem = document.querySelector('.load-more-videos');
            if (end < videos.length) {
                if (!loadMoreItem) {
                    loadMoreItem = document.createElement('button');
                    loadMoreItem.className = 'load-more load-more-videos';
                    loadMoreItem.style.cssText = 'margin: 12px 0; padding: 12px;';
                    loadMoreItem.onclick = loadMoreVideos;
                    list.appendChild(loadMoreItem);
                }
                loadMoreItem.textContent = '加载更多 (' + (videos.length - end) + ' 个剩余)';
                loadMoreItem.style.display = 'block';
            } else if (loadMoreItem) {
                loadMoreItem.style.display = 'none';
            }
            
            document.getElementById('playlistBadge').textContent = videos.length;
            setupLazyThumbnails();
        }
        
        function loadMoreVideos() {
            videoPage++;
            renderPlaylist();
        }
        function setupLazyThumbnails() {
            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var item = entry.target;
                        var thumbContainer = item.querySelector('.playlist-thumb');
                        var path = item.dataset.path;
                        if (path && !thumbContainer.dataset.loaded) {
                            thumbContainer.dataset.loaded = 'loading';
                            loadThumbnailLazy(path, thumbContainer);
                        }
                        observer.unobserve(item);
                    }
                });
            }, { rootMargin: '100px' });
            
            document.querySelectorAll('.playlist-item').forEach(function(item) {
                observer.observe(item);
            });
        }
        
        function loadThumbnailLazy(filePath, container) {
            var video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.muted = true;
            video.preload = 'metadata';
            var loaded = false;
            
            video.onloadeddata = function() {
                if (!loaded) {
                    loaded = true;
                    video.currentTime = 0.5;
                }
            };
            
            video.onseeked = function() {
                var canvas = document.createElement('canvas');
                canvas.width = 160;
                canvas.height = 90;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                var img = document.createElement('img');
                img.src = canvas.toDataURL('image/jpeg', 0.6);
                container.insertBefore(img, container.firstChild);
                container.querySelector('.playlist-thumb-icon').style.display = 'none';
                container.dataset.loaded = 'done';
                
                video.pause();
                video.src = '';
                video = null;
            };
            
            video.onerror = function() {
                container.dataset.loaded = 'error';
                video = null;
            };
            
            setTimeout(function() {
                if (video && !loaded) {
                    video.src = getVideoUrl(filePath);
                }
            }, 50);
        }
        
        function playVideo(index) {
            if (index < 0 || index >= videos.length) return;
            
            currentVideoIndex = index;
            var video = videos[index];
            var fp = video.path || video.filePath || video.file_path || '';
            var name = video.name || getFileName(fp) || '未命名';
            var size = formatSize(video.size || 0);
            var dur = video.duration ? formatDuration(video.duration) : '';
            
            document.getElementById('mainVideo').src = getVideoUrl(fp);
            document.getElementById('videoPlaceholder').style.display = 'none';
            
            var titleEl = document.getElementById('videoHeaderTitle');
            var titleText = name + ' (' + size + (dur ? ' · ' + dur : '') + ')';
            titleEl.textContent = titleText;
            titleEl.classList.remove('scroll');
            
            // 检测标题长度，过长则滚动
            var container = titleEl.parentElement;
            if (titleEl.offsetWidth > container.offsetWidth) {
                titleEl.classList.add('scroll');
            }
            
            document.querySelectorAll('.playlist-item').forEach(function(item, i) {
                item.classList.toggle('active', i === index);
            });
            
            // 更新上一个/下一个按钮状态
            document.getElementById('prevVideoBtn').disabled = index === 0;
            document.getElementById('nextVideoBtn').disabled = index === videos.length - 1;
            
            document.getElementById('mainVideo').play();
            
            // 自动隐藏播放列表
            document.getElementById('playlistPanel').classList.remove('active');
        }
        
        function prevVideo() {
            if (currentVideoIndex > 0) {
                playVideo(currentVideoIndex - 1);
            }
        }
        
        function nextVideo() {
            if (currentVideoIndex < videos.length - 1) {
                playVideo(currentVideoIndex + 1);
            }
        }
        
        function formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
        
        function formatDuration(seconds) {
            var m = Math.floor(seconds / 60);
            var s = Math.floor(seconds % 60);
            return m + ':' + (s < 10 ? '0' : '') + s;
        }
        
        // 双击放大
        var lastTap = 0;
        document.getElementById('viewerImg').addEventListener('click', function(e) {
            var now = Date.now();
            if (now - lastTap < 300) {
                toggleZoom();
                e.preventDefault();
            }
            lastTap = now;
        });
        
        // 触摸滑动
        var touchStartX = 0;
        document.getElementById('viewerPage').addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
        });
        document.getElementById('viewerPage').addEventListener('touchend', function(e) {
            var diff = touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) nextImage();
                else prevImage();
            }
        });
        
        // 视频长按快进
        var videoLongPressTimer = null;
        var mainVideo = document.getElementById('mainVideo');
        
        mainVideo.addEventListener('touchstart', function(e) {
            videoLongPressTimer = setTimeout(function() {
                mainVideo.playbackRate = 3.0;
            }, 500);
        });
        
        mainVideo.addEventListener('touchend', function() {
            if (videoLongPressTimer) {
                clearTimeout(videoLongPressTimer);
                videoLongPressTimer = null;
            }
            mainVideo.playbackRate = 1.0;
        });
        
        mainVideo.addEventListener('touchcancel', function() {
            if (videoLongPressTimer) {
                clearTimeout(videoLongPressTimer);
                videoLongPressTimer = null;
            }
            mainVideo.playbackRate = 1.0;
        });
        
        // 多视频播放功能
        function openMultiVideoPage() {
            navigate('/multi', {});
        }
        
        function setMultiGrid(cols, rows) {
            multiGridCols = cols;
            multiGridRows = rows;
            document.querySelectorAll('.multi-grid-btn').forEach(function(btn) {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            renderMultiGrid();
        }
        
        function renderMultiGrid() {
            var container = document.getElementById('multiContent');
            var total = multiGridCols * multiGridRows;
            container.style.gridTemplateColumns = 'repeat(' + multiGridCols + ', 1fr)';
            container.style.gridTemplateRows = 'repeat(' + multiGridRows + ', 1fr)';
            container.innerHTML = '';
            
            for (var i = 0; i < total; i++) {
                var cell = document.createElement('div');
                cell.className = 'multi-video-cell';
                cell.dataset.index = i;
                
                if (multiVideos[i]) {
                    var v = multiVideos[i];
                    cell.innerHTML = '<video></video><div class="multi-video-name">' + v.name + '</div>';
                    var video = cell.querySelector('video');
                    video.src = getVideoUrl(v.path);
                    video.controls = true;
                    (function(idx) {
                        cell.onclick = function(e) {
                            if (e.target.tagName !== 'VIDEO') {
                                showVideoSelector(idx);
                            }
                        };
                    })(i);
                } else {
                    cell.innerHTML = '<button class="multi-add-btn" onclick="showVideoSelector(' + i + ')">+</button>';
                }
                
                container.appendChild(cell);
            }
        }
        
        function showVideoSelector(index) {
            if (videos.length === 0) {
                alert('请先在视频库中添加视频');
                return;
            }
            
            currentSelectorIndex = index;
            var list = document.getElementById('videoSelectorList');
            list.innerHTML = '';
            
            videos.forEach(function(v, i) {
                var fp = v.path || v.filePath || v.file_path || '';
                var name = v.name || getFileName(fp) || '未命名';
                var size = formatSize(v.size || 0);
                var dur = v.duration ? formatDuration(v.duration) : '';
                
                var item = document.createElement('div');
                item.className = 'video-selector-item';
                item.innerHTML = '<div class="video-selector-thumb">▶</div>' +
                    '<div class="video-selector-info">' +
                    '<div class="video-selector-name">' + name + '</div>' +
                    '<div class="video-selector-meta">' + size + (dur ? ' · ' + dur : '') + '</div>' +
                    '</div>';
                (function(idx) {
                    item.onclick = function() { selectVideoForMulti(idx); };
                })(i);
                list.appendChild(item);
            });
            
            document.getElementById('videoSelector').classList.add('active');
        }
        
        function closeVideoSelector() {
            document.getElementById('videoSelector').classList.remove('active');
            currentSelectorIndex = -1;
        }
        
        function selectVideoForMulti(videoIndex) {
            if (currentSelectorIndex < 0 || videoIndex < 0 || videoIndex >= videos.length) return;
            
            var v = videos[videoIndex];
            multiVideos[currentSelectorIndex] = {
                path: v.path || v.filePath || v.file_path,
                name: v.name || getFileName(v.path)
            };
            
            closeVideoSelector();
            renderMultiGrid();
        }
        
        function multiPlayAll() {
            document.querySelectorAll('.multi-video-cell video').forEach(function(v) {
                v.play();
            });
        }
        
        function multiPauseAll() {
            document.querySelectorAll('.multi-video-cell video').forEach(function(v) {
                v.pause();
            });
        }
        
        function multiClearAll() {
            multiVideos = [];
            renderMultiGrid();
        }
        
        loadData();
    </script>
</body>
</html>"#.to_string()
}
