use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub id: String,
    pub name: String,
    pub provider: String,
    #[serde(rename = "type")]
    pub model_type: String,
    pub api_url: String,
    pub api_key: String,
    pub model: String,
    pub max_tokens: u32,
    pub temperature: f32,
    pub top_p: f32,
    pub group: String,
    pub is_favorite: bool,
    pub is_active: bool,
    pub created_at: u64,
    pub presets: Vec<ModelPreset>,
    pub stats: ModelStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPreset {
    pub id: String,
    pub name: String,
    pub temperature: f32,
    pub top_p: f32,
    pub max_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelStats {
    pub total_calls: u32,
    pub success_calls: u32,
    pub avg_response_time: f32,
    pub last_used: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub timestamp: u64,
    pub model_id: Option<String>,
    pub model_name: Option<String>,
    pub is_streaming: Option<bool>,
    pub is_favorite: Option<bool>,
    pub thinking: Option<String>,
    pub show_thinking: Option<bool>,
    pub thinking_duration: Option<u64>,
    pub images: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub messages: Vec<ChatMessage>,
    pub model_id: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub is_favorite: bool,
    pub total_tokens: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FfmpegOptions {
    pub ffmpeg_path: String,
    pub args: Vec<String>,
    pub task_id: Option<String>,
    pub duration: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FfmpegResult {
    pub success: bool,
    pub output: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FfmpegProgress {
    pub task_id: Option<String>,
    pub frame: Option<u32>,
    pub fps: Option<f32>,
    pub size: Option<String>,
    pub time: Option<String>,
    pub bitrate: Option<String>,
    pub speed: Option<String>,
    pub progress: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaInfo {
    pub duration: f64,
    pub format: String,
    pub size: u64,
    pub video: Option<VideoInfo>,
    pub audio: Option<AudioInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoInfo {
    pub width: u32,
    pub height: u32,
    pub codec: String,
    pub fps: f32,
    pub bitrate: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioInfo {
    pub codec: String,
    pub sample_rate: u32,
    pub channels: u32,
    pub bitrate: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoFile {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub duration: f64,
    pub width: u32,
    pub height: u32,
    pub codec: String,
    pub fps: f32,
    pub bitrate: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub modified_at: String,
    pub size: u64,
    pub digest: String,
    pub details: Option<OllamaModelDetails>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModelDetails {
    pub format: String,
    pub family: String,
    pub parameter_size: String,
    pub quantization_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaStatus {
    pub running: bool,
    pub version: Option<String>,
    pub models: Vec<OllamaModel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub id: String,
    pub name: String,
    pub size: u64,
    #[serde(rename = "type")]
    pub image_type: String,
    pub file_path: String,
    pub width: u32,
    pub height: u32,
    pub added_at: u64,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
    pub thumbnail_path: Option<String>,
    pub favorite: Option<bool>,
    pub album_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageAlbum {
    pub id: String,
    pub name: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub cover_image_id: Option<String>,
    pub description: Option<String>,
}
