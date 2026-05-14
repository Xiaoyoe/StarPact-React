use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::net::SocketAddr;
use serde::{Deserialize, Serialize};

static SERVER_RUNNING: AtomicBool = AtomicBool::new(false);
static mut SERVER_PORT: u16 = 8080;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanServerInfo {
    pub running: bool,
    pub address: String,
    pub port: u16,
}

async fn is_port_in_use(port: u16) -> bool {
    let addr: SocketAddr = format!("0.0.0.0:{}", port).parse().unwrap();
    tokio::net::TcpListener::bind(addr).await.is_err()
}

async fn check_server_health(port: u16) -> bool {
    let url = format!("http://127.0.0.1:{}/api/health", port);
    reqwest::get(&url).await
        .map(|resp| resp.status().is_success())
        .unwrap_or(false)
}

#[tauri::command]
pub async fn start_lan_server(port: u16) -> Result<LanServerInfo, String> {
    if SERVER_RUNNING.load(Ordering::SeqCst) {
        return Err("服务器已在运行中".to_string());
    }
    
    if is_port_in_use(port).await {
        if check_server_health(port).await {
            SERVER_RUNNING.store(true, Ordering::SeqCst);
            unsafe { SERVER_PORT = port; }
            
            let local_ip = local_ip_address::local_ip()
                .map_err(|e| format!("获取本地IP失败: {}", e))?;
            
            return Ok(LanServerInfo {
                running: true,
                address: format!("http://{}:{}", local_ip, port),
                port,
            });
        }
        
        return Err(format!("端口 {} 已被其他程序占用，请更换端口", port));
    }
    
    let local_ip = local_ip_address::local_ip()
        .map_err(|e| format!("获取本地IP失败: {}", e))?;
    
    let addr: SocketAddr = format!("0.0.0.0:{}", port)
        .parse()
        .map_err(|e| format!("地址格式错误: {}", e))?;
    
    unsafe { SERVER_PORT = port; }
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
        
        async fn get_health() -> impl IntoResponse {
            (axum::http::StatusCode::OK, "OK")
        }
        
        async fn get_wallpaper() -> impl IntoResponse {
            use axum::body::Body;
            use axum::http::{header, StatusCode, Response};
            
            match crate::services::wallpaper::get_active_wallpaper() {
                Ok(Some(wallpaper)) => {
                    let path = wallpaper.path;
                    
                    if path.starts_with("http://") || path.starts_with("https://") {
                        return (StatusCode::OK, axum::Json(serde_json::json!({
                            "type": "url",
                            "url": path
                        }))).into_response();
                    }
                    
                    match tokio::fs::read(&path).await {
                        Ok(bytes) => {
                            let mime = path.rsplit('.').next()
                                .map(|ext| match ext.to_lowercase().as_str() {
                                    "jpg" | "jpeg" => "image/jpeg",
                                    "png" => "image/png",
                                    "gif" => "image/gif",
                                    "webp" => "image/webp",
                                    "bmp" => "image/bmp",
                                    _ => "image/jpeg",
                                })
                                .unwrap_or("image/jpeg");
                            
                            let mut response = Response::new(Body::from(bytes));
                            *response.status_mut() = StatusCode::OK;
                            response.headers_mut().insert(header::CONTENT_TYPE, mime.parse().unwrap());
                            response
                        }
                        Err(_) => (StatusCode::NOT_FOUND, "Wallpaper file not found").into_response()
                    }
                }
                Ok(None) => (StatusCode::NOT_FOUND, "No active wallpaper").into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response()
            }
        }
        
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
            use tokio_util::io::ReaderStream;
            use tokio::io::{AsyncSeekExt, AsyncReadExt};
            
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
                                if let Err(_) = file.seek(std::io::SeekFrom::Start(range.start)).await {
                                    return (StatusCode::INTERNAL_SERVER_ERROR, "Seek failed").into_response();
                                }
                                
                                let range_size = range.end - range.start + 1;
                                let content_range = format!("bytes {}-{}/{}", range.start, range.end, file_size);
                                
                                let stream = ReaderStream::new(file.take(range_size));
                                let body = Body::from_stream(stream);
                                
                                let mut response = Response::new(body);
                                *response.status_mut() = StatusCode::PARTIAL_CONTENT;
                                response.headers_mut().insert(header::CONTENT_TYPE, mime.parse().unwrap());
                                response.headers_mut().insert(header::CONTENT_LENGTH, range_size.to_string().parse().unwrap());
                                response.headers_mut().insert(header::ACCEPT_RANGES, "bytes".parse().unwrap());
                                response.headers_mut().insert(header::CONTENT_RANGE, content_range.parse().unwrap());
                                return response.into_response();
                            }
                        }
                        
                        let stream = ReaderStream::new(file);
                        let body = Body::from_stream(stream);
                        
                        let mut response = Response::new(body);
                        *response.status_mut() = StatusCode::OK;
                        response.headers_mut().insert(header::CONTENT_TYPE, mime.parse().unwrap());
                        response.headers_mut().insert(header::CONTENT_LENGTH, file_size.to_string().parse().unwrap());
                        response.headers_mut().insert(header::ACCEPT_RANGES, "bytes".parse().unwrap());
                        response.into_response()
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
        
        async fn get_album_images(
            axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
        ) -> impl IntoResponse {
            use serde::{Deserialize, Serialize};
            
            #[derive(Debug, Clone, Serialize, Deserialize)]
            struct ImageJson {
                id: String,
                name: String,
                file_path: String,
                size: u64,
                width: u32,
                height: u32,
                thumbnail_path: Option<String>,
                added_at: u64,
            }
            
            if let Some(album_id) = params.get("album_id") {
                let db = crate::services::storage::database::get_database();
                match db.get_images(album_id) {
                    Ok(images) => {
                        let json_images: Vec<ImageJson> = images.into_iter().map(|img| ImageJson {
                            id: img.id,
                            name: img.name,
                            file_path: img.file_path,
                            size: img.size,
                            width: img.width,
                            height: img.height,
                            thumbnail_path: img.thumbnail_path,
                            added_at: img.added_at,
                        }).collect();
                        Json(json_images).into_response()
                    }
                    Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("{{\"error\": \"{}\"}}", e)).into_response(),
                }
            } else {
                (StatusCode::BAD_REQUEST, "{\"error\": \"Missing album_id\"}").into_response()
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
            .route("/api/health", axum::routing::get(get_health))
            .route("/api/wallpaper", axum::routing::get(get_wallpaper))
            .route("/api/images", axum::routing::get(get_images))
            .route("/api/albums", axum::routing::get(get_albums))
            .route("/api/album/images", axum::routing::get(get_album_images))
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
    let port = unsafe { SERVER_PORT };
    
    SERVER_RUNNING.store(false, Ordering::SeqCst);
    
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    let local_ip = local_ip_address::local_ip()
        .map_err(|e| format!("获取本地IP失败: {}", e))?;
    
    Ok(LanServerInfo {
        running: false,
        address: format!("http://{}:{}", local_ip, port),
        port,
    })
}

#[tauri::command]
pub async fn get_lan_server_status() -> Result<LanServerInfo, String> {
    let port = unsafe { SERVER_PORT };
    let local_ip = local_ip_address::local_ip()
        .map_err(|e| format!("获取本地IP失败: {}", e))?;
    
    if SERVER_RUNNING.load(Ordering::SeqCst) {
        if check_server_health(port).await {
            return Ok(LanServerInfo {
                running: true,
                address: format!("http://{}:{}", local_ip, port),
                port,
            });
        } else {
            SERVER_RUNNING.store(false, Ordering::SeqCst);
        }
    }
    
    if is_port_in_use(port).await && check_server_health(port).await {
        SERVER_RUNNING.store(true, Ordering::SeqCst);
        return Ok(LanServerInfo {
            running: true,
            address: format!("http://{}:{}", local_ip, port),
            port,
        });
    }
    
    Ok(LanServerInfo {
        running: false,
        address: format!("http://{}:{}", local_ip, port),
        port,
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
        
        /* 欢迎页面 - 支持壁纸背景 */
        .welcome {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #1a1a2e;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            padding: 20px;
            padding-top: 60px;
            position: relative;
        }
        .welcome::before {
            content: '';
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 0;
        }
        .welcome > * {
            position: relative;
            z-index: 1;
        }
        .welcome h1 { color: white; font-size: 28px; margin-bottom: 6px; font-weight: 600; letter-spacing: 2px; }
        .welcome p { color: rgba(255,255,255,0.5); font-size: 13px; margin-bottom: 24px; }
        .refresh-time {
            background: rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 14px 20px;
            margin-bottom: 28px;
            text-align: center;
            min-width: 280px;
        }
        .refresh-time-label {
            color: rgba(255,255,255,0.5);
            font-size: 12px;
            margin-bottom: 6px;
        }
        .refresh-time-value {
            color: #667eea;
            font-size: 15px;
            font-weight: 500;
            font-family: monospace;
        }
        .refresh-time-hint {
            color: rgba(255,255,255,0.35);
            font-size: 11px;
            margin-top: 8px;
        }
        .welcome-cards { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
        .welcome-card {
            width: 100px;
            padding: 20px 12px;
            background: rgba(255,255,255,0.08);
            border-radius: 16px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
        }
        .welcome-card:hover { 
            background: rgba(255,255,255,0.15); 
            transform: translateY(-6px) scale(1.02);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .welcome-card-icon { 
            width: 56px;
            height: 56px;
            margin: 0 auto 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 16px;
            color: white;
            transition: all 0.3s ease;
        }
        .welcome-card:hover .welcome-card-icon {
            transform: scale(1.1);
        }
        .welcome-card-icon-image { 
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
        }
        .welcome-card-icon-video { 
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            box-shadow: 0 4px 15px rgba(79, 172, 254, 0.4);
        }
        .welcome-card-icon-multi { 
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            box-shadow: 0 4px 15px rgba(67, 233, 123, 0.4);
        }
        .welcome-card-icon-album { 
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
            box-shadow: 0 4px 15px rgba(250, 112, 154, 0.4);
        }
        .welcome-card-icon-library { 
            background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
            box-shadow: 0 4px 15px rgba(161, 140, 209, 0.4);
        }
        .welcome-card-icon-chat { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .welcome-card-title { color: white; font-size: 13px; font-weight: 500; }
        
        .welcome-datetime-top {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            color: rgba(255,255,255,0.6);
            font-size: 14px;
            font-weight: 300;
            letter-spacing: 1px;
            padding: 12px 16px;
            background: rgba(0,0,0,0.3);
            text-align: center;
        }
        
        /* 图片页面 */
        .image-page { display: none; min-height: 100vh; background: #f5f5f5; }
        .image-page.active { display: block; }
        
        /* 相册选择 */
        .album-selector {
            padding: 20px 16px;
            background: #f5f5f5;
            min-height: calc(100vh - 48px);
        }
        .album-selector-title {
            font-size: 20px;
            font-weight: 600;
            color: #1a1a2e;
            margin-bottom: 4px;
        }
        .album-selector-desc {
            font-size: 13px;
            color: #666;
            margin-bottom: 20px;
        }
        .album-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .album-item {
            display: flex;
            align-items: center;
            gap: 14px;
            background: white;
            padding: 14px 16px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .album-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }
        .album-item-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;
        }
        .album-item-info {
            flex: 1;
            min-width: 0;
        }
        .album-item-name {
            font-size: 15px;
            font-weight: 500;
            color: #1a1a2e;
            margin-bottom: 2px;
        }
        .album-item-count {
            font-size: 12px;
            color: #888;
        }
        .album-divider {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 8px 0;
        }
        .album-divider::before, .album-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #ddd;
        }
        .album-divider span {
            font-size: 12px;
            color: #999;
            white-space: nowrap;
        }
        
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
        
        /* 横屏模式 */
        .viewer-page.landscape-mode {
            position: fixed;
            width: 100vh;
            height: 100vw;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(90deg);
            transform-origin: center center;
        }
        .viewer-page.landscape-mode .viewer-header {
            padding: 8px 12px;
        }
        .viewer-page.landscape-mode .viewer-footer {
            padding: 12px 16px 16px;
        }
        .viewer-page.landscape-mode .viewer-btn {
            width: 40px;
            height: 40px;
            font-size: 16px;
        }
        .viewer-btn.active {
            background: rgba(100, 150, 255, 0.4);
        }
        .viewer-zoom-btn {
            display: none;
            font-size: 20px !important;
            font-weight: bold;
        }
        .viewer-page.landscape-mode .viewer-zoom-btn {
            display: flex;
        }
        .viewer-zoom-out {
            margin-right: auto;
        }
        .viewer-zoom-in {
            margin-left: auto;
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
        
        /* 立刻播放按钮 */
        .play-now-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
            padding: 6px 14px;
            border-radius: 16px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
            transition: all 0.2s;
            white-space: nowrap;
        }
        .play-now-btn:hover { transform: scale(1.05); opacity: 0.9; }
        .play-now-btn.hidden { display: none; }
        
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
        
        /* 视频库页面 */
        .video-library-page { display: none; min-height: 100vh; background: #0f0f1a; }
        .video-library-page.active { display: flex; flex-direction: column; }
        .video-layout-switch {
            display: flex;
            gap: 6px;
            margin-left: auto;
        }
        .layout-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .layout-btn:hover { background: rgba(255,255,255,0.2); }
        .layout-btn.active { background: #667eea; }
        .video-library-content {
            flex: 1;
            padding: 12px;
            overflow-y: auto;
        }
        .video-library-grid {
            display: grid;
            gap: 12px;
            grid-template-columns: 1fr;
        }
        .video-library-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
        .video-library-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
        .video-item {
            background: #1a1a2e;
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s;
        }
        .video-item:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .video-thumb {
            position: relative;
            width: 100%;
            padding-top: 56.25%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            overflow: hidden;
        }
        .video-thumb img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .video-thumb-placeholder {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
            background: rgba(0,0,0,0.3);
        }
        .video-thumb-loading {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255,255,255,0.5);
            font-size: 12px;
        }
        .video-duration {
            position: absolute;
            bottom: 6px;
            right: 6px;
            background: rgba(0,0,0,0.7);
            color: white;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 4px;
        }
        .video-info {
            padding: 10px 12px;
        }
        .video-name {
            color: white;
            font-size: 13px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 4px;
        }
        .video-meta {
            color: rgba(255,255,255,0.4);
            font-size: 11px;
        }
        
        /* 悬浮刷新按钮 */
        .floating-refresh-btn {
            position: fixed;
            right: 16px;
            bottom: 30px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 50%;
            color: white;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            z-index: 999;
            transition: all 0.3s ease;
        }
        .floating-refresh-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        .floating-refresh-btn:active {
            transform: scale(0.95);
        }
        .floating-refresh-btn.loading {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <!-- 欢迎页面 -->
    <div class="welcome" id="welcome">
        <div class="welcome-datetime-top" id="welcomeDatetime">--</div>
        <h1>Starpact 星约</h1>
        <p>选择要浏览的内容</p>
        
        <div class="refresh-time">
            <div class="refresh-time-label">📅 数据同步时间</div>
            <div class="refresh-time-value" id="refreshTimeValue">--</div>
            <div class="refresh-time-hint">刷新页面可更新时间，用于确认数据是否同步</div>
        </div>
        
        <div class="welcome-cards">
            <div class="welcome-card" onclick="openImageGallery()">
                <div class="welcome-card-icon welcome-card-icon-image">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="3"/>
                        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                        <path d="M21 15l-5-5L5 21"/>
                    </svg>
                </div>
                <div class="welcome-card-title">图片库</div>
            </div>
            <div class="welcome-card" onclick="openVideoPage()">
                <div class="welcome-card-icon welcome-card-icon-video">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
                    </svg>
                </div>
                <div class="welcome-card-title">视频播放</div>
            </div>
            <div class="welcome-card" onclick="showChatComingSoon()">
                <div class="welcome-card-icon welcome-card-icon-chat">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </div>
                <div class="welcome-card-title">聊天</div>
            </div>
            <div class="welcome-card" onclick="openImageAlbums()">
                <div class="welcome-card-icon welcome-card-icon-album">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                </div>
                <div class="welcome-card-title">图片相册</div>
            </div>
            <div class="welcome-card" onclick="openVideoLibrary()">
                <div class="welcome-card-icon welcome-card-icon-library">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="2" y="4" width="15" height="16" rx="2"/>
                        <path d="M10 9l5 3-5 3V9z" fill="currentColor"/>
                        <path d="M17 8l5-2v12l-5-2V8z"/>
                    </svg>
                </div>
                <div class="welcome-card-title">视频库</div>
            </div>
            <div class="welcome-card" onclick="openMultiVideoPage()">
                <div class="welcome-card-icon welcome-card-icon-multi">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="1" y="3" width="10" height="7" rx="1"/>
                        <rect x="13" y="3" width="10" height="7" rx="1"/>
                        <rect x="1" y="14" width="10" height="7" rx="1"/>
                        <rect x="13" y="14" width="10" height="7" rx="1"/>
                    </svg>
                </div>
                <div class="welcome-card-title">多视频播放</div>
            </div>
        </div>
    </div>
    
    <!-- 图片页面 -->
    <div class="image-page" id="imagePage">
        <div class="page-header">
            <button class="back-btn" onclick="goHome()">‹</button>
            <span class="page-title">📷 图片库</span>
        </div>
        <div class="content">
            <div class="grid" id="imageGrid"></div>
            <button class="load-more" id="loadMoreImages" style="display:none;" onclick="loadMoreImages()">
                加载更多图片
            </button>
        </div>
    </div>
    
    <!-- 图片相册页面 -->
    <div class="image-page" id="albumPage">
        <div class="page-header">
            <button class="back-btn" onclick="goHome()">‹</button>
            <span class="page-title" id="albumPageTitle">📁 图片相册</span>
        </div>
        
        <!-- 相册选择区域 -->
        <div class="album-selector" id="albumSelector">
            <div class="album-selector-title">选择相册</div>
            <div class="album-selector-desc">请选择要查看的图片来源</div>
            <div class="album-list" id="albumList">
                <div class="album-item album-item-all" onclick="selectAllImages()">
                    <div class="album-item-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                    </div>
                    <div class="album-item-info">
                        <div class="album-item-name">全部图片</div>
                        <div class="album-item-count" id="allImageCount">0 张</div>
                    </div>
                </div>
                <div class="album-divider" id="albumDivider" style="display:none;">
                    <span>自定义相册</span>
                </div>
                <div id="customAlbumList"></div>
            </div>
        </div>
        
        <!-- 图片网格区域 -->
        <div class="content" id="albumImageContent" style="display:none;">
            <div class="grid" id="albumImageGrid"></div>
            <button class="load-more" id="loadMoreAlbumImages" style="display:none;" onclick="loadMoreAlbumImages()">
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
            <button class="viewer-btn viewer-zoom-btn viewer-zoom-out" id="zoomOutBtn" onclick="zoomOutImage()">−</button>
            <button class="viewer-btn" id="prevBtn" onclick="prevImage()">‹</button>
            <span class="viewer-counter" id="viewerCounter">1 / 1</span>
            <button class="viewer-btn" onclick="rotateImage()">↻</button>
            <button class="viewer-btn" id="landscapeBtn" onclick="toggleLandscape()">⤴</button>
            <button class="viewer-btn" id="nextBtn" onclick="nextImage()">›</button>
            <button class="viewer-btn viewer-zoom-btn viewer-zoom-in" id="zoomInBtn" onclick="zoomInImage()">+</button>
        </div>
    </div>
    
    <!-- 视频库页面 -->
    <div class="video-library-page" id="videoLibraryPage">
        <div class="page-header">
            <button class="back-btn" onclick="goHome()">‹</button>
            <span class="page-title">🎬 视频库</span>
            <div class="video-layout-switch">
                <button class="layout-btn active" data-cols="1" onclick="setVideoLayout(1)">☰</button>
                <button class="layout-btn" data-cols="2" onclick="setVideoLayout(2)">▦</button>
                <button class="layout-btn" data-cols="3" onclick="setVideoLayout(3)">▦</button>
            </div>
        </div>
        <div class="video-library-content">
            <div class="video-library-grid" id="videoLibraryGrid"></div>
            <button class="load-more" id="loadMoreVideoLibrary" style="display:none;" onclick="loadMoreVideoLibrary()">
                加载更多视频
            </button>
        </div>
    </div>
    
    <!-- 视频页面 -->
    <div class="video-page" id="videoPage">
        <div class="video-header">
            <button class="back-btn" onclick="goHome()">‹</button>
            <button class="play-now-btn" id="playNowBtn" onclick="playFirstVideo()">▶ 立刻播放</button>
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
    
    <!-- 悬浮刷新按钮 -->
    <button class="floating-refresh-btn" id="floatingRefreshBtn" onclick="refreshAllData()" title="刷新数据">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"/>
            <path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
    </button>

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
        var videoLibraryPage = 0;
        var videoLayout = 1;
        var IMAGE_PAGE_SIZE = 50;
        var VIDEO_PAGE_SIZE = 30;
        var VIDEO_LIBRARY_PAGE_SIZE = 20;
        
        function updateRefreshTime() {
            var now = new Date();
            var year = now.getFullYear();
            var month = String(now.getMonth() + 1).padStart(2, '0');
            var day = String(now.getDate()).padStart(2, '0');
            var hours = String(now.getHours()).padStart(2, '0');
            var minutes = String(now.getMinutes()).padStart(2, '0');
            var seconds = String(now.getSeconds()).padStart(2, '0');
            var timeStr = year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
            document.getElementById('refreshTimeValue').textContent = timeStr;
        }
        
        function updateWelcomeDatetime() {
            var now = new Date();
            var weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            var year = now.getFullYear();
            var month = String(now.getMonth() + 1).padStart(2, '0');
            var day = String(now.getDate()).padStart(2, '0');
            var weekDay = weekDays[now.getDay()];
            var hours = String(now.getHours()).padStart(2, '0');
            var minutes = String(now.getMinutes()).padStart(2, '0');
            var seconds = String(now.getSeconds()).padStart(2, '0');
            var datetimeStr = year + '年' + month + '月' + day + '日 ' + weekDay + ' ' + hours + ':' + minutes + ':' + seconds;
            document.getElementById('welcomeDatetime').textContent = datetimeStr;
        }
        
        function startDatetimeTimer() {
            updateWelcomeDatetime();
            setInterval(updateWelcomeDatetime, 1000);
        }
        
        function loadWallpaper() {
            fetch('/api/wallpaper')
                .then(function(response) {
                    if (response.ok) {
                        var contentType = response.headers.get('content-type');
                        if (contentType && contentType.indexOf('application/json') !== -1) {
                            return response.json().then(function(data) {
                                if (data.type === 'url' && data.url) {
                                    document.getElementById('welcome').style.backgroundImage = 'url(' + data.url + ')';
                                }
                            });
                        } else {
                            return response.blob().then(function(blob) {
                                var url = URL.createObjectURL(blob);
                                document.getElementById('welcome').style.backgroundImage = 'url(' + url + ')';
                            });
                        }
                    }
                })
                .catch(function() {});
        }
        
        updateRefreshTime();
        loadWallpaper();
        startDatetimeTimer();
        
        // 路由管理
        function navigate(path, state) {
            history.pushState(state || {}, '', path);
            handleRoute(path, state);
        }
        
        function handleRoute(path, state) {
            hideAllPages();
            updateFloatingRefreshBtn();
            
            if (path === '/' || path === '') {
                document.getElementById('welcome').style.display = 'flex';
            } else if (path === '/images') {
                document.getElementById('imagePage').classList.add('active');
                if (state && state.page) imagePage = state.page;
                showAllImagesDirectly();
            } else if (path === '/albums') {
                document.getElementById('albumPage').classList.add('active');
                if (state && state.page) imagePage = state.page;
                showAlbumSelectorAsync();
            } else if (path === '/videos') {
                document.getElementById('videoPage').classList.add('active');
                document.getElementById('playlistToggle').classList.add('active');
                if (state && state.page) videoPage = state.page;
                if (state && state.videoIndex !== undefined) {
                    currentVideoIndex = state.videoIndex;
                    playVideo(currentVideoIndex);
                }
                renderPlaylist();
                document.getElementById('prevVideoBtn').disabled = currentVideoIndex <= 0;
                document.getElementById('nextVideoBtn').disabled = currentVideoIndex < 0 || currentVideoIndex >= videos.length - 1;
            } else if (path === '/video-library') {
                document.getElementById('videoLibraryPage').classList.add('active');
                if (state && state.page) videoLibraryPage = state.page;
                if (state && state.layout) videoLayout = state.layout;
                renderVideoLibrary();
            } else if (path === '/viewer') {
                document.getElementById('viewerPage').classList.add('active');
                if (state && state.index !== undefined) {
                    currentImageIndex = state.index;
                    imageRotation = 0;
                    imageZoomLevel = 1;
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
            document.getElementById('albumPage').classList.remove('active');
            document.getElementById('videoPage').classList.remove('active');
            document.getElementById('videoLibraryPage').classList.remove('active');
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
            videoLibraryPage = 0;
            updateRefreshTime();
            loadWallpaper();
        }
        
        function openImageGallery() {
            imagePage = 0;
            navigate('/images', { page: 0 });
        }
        
        function openImageAlbums() {
            imagePage = 0;
            currentAlbumId = null;
            navigate('/albums', { page: 0 });
        }
        
        function openVideoLibrary() {
            videoLibraryPage = 0;
            navigate('/video-library', { page: 0, layout: videoLayout });
        }
        
        function showAllImagesDirectly() {
            currentAlbumId = null;
            document.getElementById('albumSelector').style.display = 'none';
            document.getElementById('albumImageContent').style.display = 'block';
            document.getElementById('albumPageTitle').textContent = '📷 图片库';
            renderImages();
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
        
        // 图片页面 - 相册选择
        async function openImagePage() {
            imagePage = 0;
            currentAlbumId = null;
            navigate('/images', { page: 0 });
            if (images.length === 0) {
                await loadData();
            }
            showAlbumSelector();
        }
        
        var currentAlbumId = null;
        var customAlbums = [];
        
        function showAlbumSelector() {
            document.getElementById('albumSelector').style.display = 'block';
            document.getElementById('albumImageContent').style.display = 'none';
            document.getElementById('albumPageTitle').textContent = '📁 图片相册';
            
            document.getElementById('allImageCount').textContent = images.length + ' 张';
            
            loadCustomAlbums();
        }
        
        async function showAlbumSelectorAsync() {
            if (images.length === 0) {
                await loadData();
            }
            document.getElementById('allImageCount').textContent = images.length + ' 张';
            loadCustomAlbums();
            document.getElementById('albumSelector').style.display = 'block';
            document.getElementById('albumImageContent').style.display = 'none';
            document.getElementById('albumPageTitle').textContent = '📁 图片相册';
        }
        
        function loadCustomAlbums() {
            fetch('/api/albums')
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    customAlbums = data || [];
                    var container = document.getElementById('customAlbumList');
                    var divider = document.getElementById('albumDivider');
                    
                    if (customAlbums.length > 0) {
                        divider.style.display = 'flex';
                        container.innerHTML = customAlbums.map(function(album) {
                            var count = album.image_count || album.imageCount || 0;
                            return '<div class="album-item" onclick="selectAlbum(\'' + album.id + '\', \'' + escapeHtml(album.name) + '\')">' +
                                '<div class="album-item-icon">' +
                                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                                        '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' +
                                    '</svg>' +
                                '</div>' +
                                '<div class="album-item-info">' +
                                    '<div class="album-item-name">' + escapeHtml(album.name) + '</div>' +
                                    '<div class="album-item-count">' + count + ' 张</div>' +
                                '</div>' +
                            '</div>';
                        }).join('');
                    } else {
                        divider.style.display = 'none';
                        container.innerHTML = '';
                    }
                })
                .catch(function() {
                    document.getElementById('albumDivider').style.display = 'none';
                    document.getElementById('customAlbumList').innerHTML = '';
                });
        }
        
        function escapeHtml(text) {
            if (!text) return '';
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function selectAllImages() {
            currentAlbumId = null;
            document.getElementById('albumSelector').style.display = 'none';
            document.getElementById('albumImageContent').style.display = 'block';
            document.getElementById('albumPageTitle').textContent = '📷 全部图片';
            renderAlbumImages();
        }
        
        function selectAlbum(albumId, albumName) {
            currentAlbumId = albumId;
            document.getElementById('albumSelector').style.display = 'none';
            document.getElementById('albumImageContent').style.display = 'block';
            document.getElementById('albumPageTitle').textContent = '📷 ' + albumName;
            loadAlbumImages(albumId);
        }
        
        function loadAlbumImages(albumId) {
            fetch('/api/album/images?album_id=' + encodeURIComponent(albumId))
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    if (Array.isArray(data)) {
                        images = data.map(function(img) {
                            return {
                                filePath: img.file_path,
                                thumbnailPath: img.thumbnail_path,
                                name: img.name,
                                size: img.size,
                                width: img.width,
                                height: img.height
                            };
                        });
                    } else {
                        images = [];
                    }
                    renderAlbumImages();
                })
                .catch(function() {
                    images = [];
                    renderAlbumImages();
                });
        }
        
        var albumImages = [];
        var albumImagePage = 0;
        
        function renderAlbumImages() {
            var grid = document.getElementById('albumImageGrid');
            if (images.length === 0) {
                grid.innerHTML = '<div class="empty">暂无图片</div>';
                document.getElementById('loadMoreAlbumImages').style.display = 'none';
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
            
            var loadMoreBtn = document.getElementById('loadMoreAlbumImages');
            if (end < images.length) {
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.textContent = '加载更多 (' + (images.length - end) + ' 张剩余)';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
        
        function loadMoreAlbumImages() {
            imagePage++;
            renderAlbumImages();
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
            imageZoomLevel = 1;
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
                imageZoomLevel = 1;
                showImage(currentImageIndex - 1);
            }
        }
        
        function nextImage() {
            if (currentImageIndex < images.length - 1) {
                imageRotation = 0;
                imageZoomLevel = 1;
                showImage(currentImageIndex + 1);
            }
        }
        
        function rotateImage() {
            imageRotation = (imageRotation + 90) % 360;
            updateImageTransform();
        }
        
        var isLandscapeMode = false;
        
        function toggleLandscape() {
            isLandscapeMode = !isLandscapeMode;
            var viewerPage = document.getElementById('viewerPage');
            var landscapeBtn = document.getElementById('landscapeBtn');
            
            if (isLandscapeMode) {
                viewerPage.classList.add('landscape-mode');
                landscapeBtn.classList.add('active');
                
                if (screen.orientation && screen.orientation.lock) {
                    screen.orientation.lock('landscape').catch(function() {});
                }
            } else {
                viewerPage.classList.remove('landscape-mode');
                landscapeBtn.classList.remove('active');
                
                if (screen.orientation && screen.orientation.unlock) {
                    screen.orientation.unlock();
                }
            }
        }
        
        var imageZoomLevel = 1;
        var zoomLevels = [1, 1.5, 2, 2.5, 3];
        
        function zoomInImage() {
            var currentIndex = zoomLevels.indexOf(imageZoomLevel);
            if (currentIndex < zoomLevels.length - 1) {
                imageZoomLevel = zoomLevels[currentIndex + 1];
                updateImageTransform();
            }
        }
        
        function zoomOutImage() {
            var currentIndex = zoomLevels.indexOf(imageZoomLevel);
            if (currentIndex > 0) {
                imageZoomLevel = zoomLevels[currentIndex - 1];
                updateImageTransform();
            }
        }
        
        function toggleZoom() {
            if (imageZoomLevel === 1) {
                imageZoomLevel = 2;
            } else {
                imageZoomLevel = 1;
            }
            var img = document.getElementById('viewerImg');
            if (imageZoomLevel > 1) {
                img.classList.add('zoomed');
            } else {
                img.classList.remove('zoomed');
            }
            updateImageTransform();
        }
        
        function updateImageTransform() {
            var img = document.getElementById('viewerImg');
            img.style.transform = 'rotate(' + imageRotation + 'deg) scale(' + imageZoomLevel + ')';
        }
        
        function closeViewer() {
            history.back();
            imageZoomLevel = 1;
            imageRotation = 0;
            
            if (isLandscapeMode) {
                isLandscapeMode = false;
                document.getElementById('viewerPage').classList.remove('landscape-mode');
                document.getElementById('landscapeBtn').classList.remove('active');
                if (screen.orientation && screen.orientation.unlock) {
                    screen.orientation.unlock();
                }
            }
        }
        
        // 视频页面 - 分页加载
        function openVideoPage() {
            videoPage = 0;
            currentVideoIndex = -1;
            navigate('/videos', { page: 0 });
            updatePlayNowBtn();
        }
        
        function updatePlayNowBtn() {
            var btn = document.getElementById('playNowBtn');
            if (currentVideoIndex < 0 && videos.length > 0) {
                btn.classList.remove('hidden');
            } else {
                btn.classList.add('hidden');
            }
        }
        
        function playFirstVideo() {
            if (videos.length > 0) {
                playVideo(0);
            }
        }
        
        function togglePlaylist() {
            var panel = document.getElementById('playlistPanel');
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
            updatePlayNowBtn();
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
            document.getElementById('playNowBtn').classList.add('hidden');
            
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
            if (!bytes || bytes <= 0) return '0 B';
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
            return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        }
        
        function formatDuration(seconds) {
            if (!seconds || seconds <= 0) return '0:00';
            var h = Math.floor(seconds / 3600);
            var m = Math.floor((seconds % 3600) / 60);
            var s = Math.floor(seconds % 60);
            if (h > 0) {
                return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
            }
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
        
        // 视频库功能
        function setVideoLayout(cols) {
            videoLayout = cols;
            document.querySelectorAll('.layout-btn').forEach(function(btn) {
                btn.classList.remove('active');
                if (parseInt(btn.dataset.cols) === cols) {
                    btn.classList.add('active');
                }
            });
            var grid = document.getElementById('videoLibraryGrid');
            grid.className = 'video-library-grid';
            if (cols === 2) grid.classList.add('cols-2');
            if (cols === 3) grid.classList.add('cols-3');
        }
        
        function renderVideoLibrary() {
            var grid = document.getElementById('videoLibraryGrid');
            grid.className = 'video-library-grid';
            if (videoLayout === 2) grid.classList.add('cols-2');
            if (videoLayout === 3) grid.classList.add('cols-3');
            
            document.querySelectorAll('.layout-btn').forEach(function(btn) {
                btn.classList.remove('active');
                if (parseInt(btn.dataset.cols) === videoLayout) {
                    btn.classList.add('active');
                }
            });
            
            if (videos.length === 0) {
                grid.innerHTML = '<div class="empty">暂无视频</div>';
                document.getElementById('loadMoreVideoLibrary').style.display = 'none';
                return;
            }
            
            var start = 0;
            var end = Math.min(VIDEO_LIBRARY_PAGE_SIZE * (videoLibraryPage + 1), videos.length);
            
            if (videoLibraryPage === 0) {
                grid.innerHTML = '';
            }
            
            for (var i = VIDEO_LIBRARY_PAGE_SIZE * videoLibraryPage; i < end; i++) {
                var video = videos[i];
                var fp = video.path || video.filePath || video.file_path || '';
                var name = video.name || getFileName(fp) || '未命名';
                var size = formatSize(video.size || 0);
                var dur = video.duration ? formatDuration(video.duration) : '';
                
                var item = document.createElement('div');
                item.className = 'video-item';
                item.dataset.index = i;
                item.dataset.path = fp;
                item.innerHTML = '<div class="video-thumb">' +
                    '<div class="video-thumb-placeholder">▶</div>' +
                    '<div class="video-thumb-loading">加载中...</div>' +
                    (dur ? '<div class="video-duration">' + dur + '</div>' : '') +
                '</div>' +
                '<div class="video-info">' +
                    '<div class="video-name">' + escapeHtml(name) + '</div>' +
                    '<div class="video-meta">' + size + '</div>' +
                '</div>';
                
                (function(idx) {
                    item.onclick = function() { playVideoFromLibrary(idx); };
                })(i);
                
                grid.appendChild(item);
            }
            
            var loadMoreBtn = document.getElementById('loadMoreVideoLibrary');
            if (end < videos.length) {
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.textContent = '加载更多 (' + (videos.length - end) + ' 个剩余)';
            } else {
                loadMoreBtn.style.display = 'none';
            }
            
            setupVideoLibraryLazyLoad();
        }
        
        function loadMoreVideoLibrary() {
            videoLibraryPage++;
            renderVideoLibrary();
        }
        
        function setupVideoLibraryLazyLoad() {
            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var item = entry.target;
                        var thumbContainer = item.querySelector('.video-thumb');
                        var path = item.dataset.path;
                        if (path && !thumbContainer.dataset.loaded) {
                            thumbContainer.dataset.loaded = 'loading';
                            loadVideoThumbnail(path, thumbContainer);
                        }
                        observer.unobserve(item);
                    }
                });
            }, { rootMargin: '100px' });
            
            document.querySelectorAll('.video-item').forEach(function(item) {
                observer.observe(item);
            });
        }
        
        function loadVideoThumbnail(filePath, container) {
            var video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;
            video.preload = 'metadata';
            var loaded = false;
            var timeout = null;
            
            video.onloadedmetadata = function() {
                if (!loaded) {
                    loaded = true;
                    video.currentTime = Math.min(0.5, video.duration * 0.1);
                }
            };
            
            video.onseeked = function() {
                if (timeout) clearTimeout(timeout);
                try {
                    var canvas = document.createElement('canvas');
                    canvas.width = 320;
                    canvas.height = 180;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    var img = document.createElement('img');
                    img.src = canvas.toDataURL('image/jpeg', 0.7);
                    container.insertBefore(img, container.firstChild);
                    
                    var placeholder = container.querySelector('.video-thumb-placeholder');
                    var loading = container.querySelector('.video-thumb-loading');
                    if (placeholder) placeholder.style.display = 'none';
                    if (loading) loading.style.display = 'none';
                    container.dataset.loaded = 'done';
                } catch(e) {
                    container.dataset.loaded = 'error';
                }
                
                video.pause();
                video.src = '';
                video = null;
            };
            
            video.onerror = function() {
                if (timeout) clearTimeout(timeout);
                var placeholder = container.querySelector('.video-thumb-placeholder');
                var loading = container.querySelector('.video-thumb-loading');
                if (loading) loading.style.display = 'none';
                container.dataset.loaded = 'error';
                video = null;
            };
            
            timeout = setTimeout(function() {
                if (video && !loaded) {
                    video.src = getVideoUrl(filePath);
                }
            }, 100);
            
            video.src = getVideoUrl(filePath);
        }
        
        function playVideoFromLibrary(index) {
            navigate('/videos', { videoIndex: index });
        }
        
        function showChatComingSoon() {
            alert('💬 聊天功能开发中，敬请期待！');
        }
        
        // 悬浮刷新按钮功能
        function refreshAllData() {
            location.reload();
        }
        
        function updateFloatingRefreshBtn() {
            var btn = document.getElementById('floatingRefreshBtn');
            var path = location.pathname;
            if (path === '/' || path === '') {
                btn.style.display = 'flex';
            } else {
                btn.style.display = 'none';
            }
        }
        
        loadData();
        updateFloatingRefreshBtn();
    </script>
</body>
</html>"#.to_string()
}
