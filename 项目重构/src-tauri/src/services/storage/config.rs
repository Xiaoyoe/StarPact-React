use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use super::paths::{get_config_path, ensure_data_dirs};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    #[serde(default)]
    pub theme: String,
    #[serde(default)]
    pub language: String,
    #[serde(default)]
    pub ffmpeg: FfmpegConfig,
    #[serde(default)]
    pub ollama: OllamaConfig,
    #[serde(default)]
    pub ui: UiConfig,
    #[serde(default)]
    pub modules: HashMap<String, ModuleConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FfmpegConfig {
    #[serde(default)]
    pub bin_path: String,
    #[serde(default)]
    pub ffmpeg_path: String,
    #[serde(default)]
    pub ffprobe_path: String,
    #[serde(default)]
    pub configured: bool,
    #[serde(default)]
    pub default_preset: String,
    #[serde(default)]
    pub output_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OllamaConfig {
    #[serde(default)]
    pub api_url: String,
    #[serde(default)]
    pub default_model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UiConfig {
    #[serde(default = "default_true")]
    pub show_bottom_nav: bool,
    #[serde(default)]
    pub sidebar_collapsed: bool,
    #[serde(default)]
    pub window_size: WindowSize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WindowSize {
    #[serde(default = "default_width")]
    pub width: u32,
    #[serde(default = "default_height")]
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ModuleConfig {
    #[serde(default)]
    pub path: String,
    #[serde(default)]
    pub enabled: bool,
}

fn default_true() -> bool { true }
fn default_width() -> u32 { 1280 }
fn default_height() -> u32 { 800 }

impl AppConfig {
    pub fn load() -> Result<Self, String> {
        ensure_data_dirs()?;
        
        let config_path = get_config_path();
        
        if !config_path.exists() {
            let default_config = AppConfig::default();
            default_config.save()?;
            return Ok(default_config);
        }
        
        let content = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config file: {}", e))?;
        
        let config: AppConfig = serde_json::from_str(&content)
            .unwrap_or_else(|_| AppConfig::default());
        
        Ok(config)
    }
    
    pub fn save(&self) -> Result<(), String> {
        let config_path = get_config_path();
        
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        
        std::fs::write(&config_path, content)
            .map_err(|e| format!("Failed to write config file: {}", e))?;
        
        Ok(())
    }
    
    pub fn update<F>(&mut self, f: F) -> Result<(), String>
    where
        F: FnOnce(&mut Self)
    {
        f(self);
        self.save()
    }
}

static CONFIG: once_cell::sync::Lazy<std::sync::Mutex<AppConfig>> = once_cell::sync::Lazy::new(|| {
    let config = AppConfig::load().unwrap_or_default();
    std::sync::Mutex::new(config)
});

pub fn get_config() -> std::sync::MutexGuard<'static, AppConfig> {
    CONFIG.lock().unwrap()
}

pub fn update_config<F>(f: F) -> Result<(), String>
where
    F: FnOnce(&mut AppConfig)
{
    let mut config = CONFIG.lock().map_err(|e| e.to_string())?;
    f(&mut config);
    config.save()
}

pub fn get_ffmpeg_config() -> FfmpegConfig {
    let config = CONFIG.lock().unwrap();
    config.ffmpeg.clone()
}

pub fn save_ffmpeg_config(ffmpeg: FfmpegConfig) -> Result<(), String> {
    let mut config = CONFIG.lock().map_err(|e| e.to_string())?;
    config.ffmpeg = ffmpeg;
    config.save()
}

pub fn get_module_path(module: &str) -> Option<String> {
    let config = CONFIG.lock().unwrap();
    config.modules.get(module).map(|m| m.path.clone()).filter(|p| !p.is_empty())
}

pub fn save_module_path(module: String, path: String) -> Result<(), String> {
    let mut config = CONFIG.lock().map_err(|e| e.to_string())?;
    config.modules.entry(module)
        .or_insert_with(ModuleConfig::default)
        .path = path;
    config.save()
}
