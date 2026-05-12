use crate::models::{LMStudioModel, LMStudioStatus, OllamaModel, OllamaStatus, LocalServiceStatus};
use tauri::Emitter;

#[tauri::command]
pub async fn ollama_check_status() -> Result<OllamaStatus, String> {
    let client = reqwest::Client::new();

    let response = client
        .get("http://localhost:11434/api/version")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await;

    match response {
        Ok(resp) => {
            let version = resp.json::<serde_json::Value>().await
                .ok()
                .and_then(|v| v.get("version").and_then(|v| v.as_str().map(|s| s.to_string())));

            let models = ollama_get_models().await.unwrap_or_default();

            Ok(OllamaStatus {
                running: true,
                version,
                models,
            })
        }
        Err(_) => Ok(OllamaStatus {
            running: false,
            version: None,
            models: Vec::new(),
        }),
    }
}

#[tauri::command]
pub async fn ollama_get_models() -> Result<Vec<OllamaModel>, String> {
    let client = reqwest::Client::new();

    let response = client
        .get("http://localhost:11434/api/tags")
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    let models = json
        .get("models")
        .and_then(|m| m.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| serde_json::from_value(m.clone()).ok())
                .collect()
        })
        .unwrap_or_default();

    Ok(models)
}

#[tauri::command]
pub async fn ollama_pull_model(model_name: String, app: tauri::AppHandle) -> Result<(), String> {
    let client = reqwest::Client::new();

    let response = client
        .post("http://localhost:11434/api/pull")
        .json(&serde_json::json!({ "name": model_name, "stream": true }))
        .timeout(std::time::Duration::from_secs(3600))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    use futures_util::StreamExt;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        if let Ok(chunk) = chunk {
            if let Ok(text) = std::str::from_utf8(&chunk) {
                if let Ok(progress) = serde_json::from_str::<serde_json::Value>(text) {
                    let _ = app.emit("ollama:pull_progress", &progress);
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn ollama_delete_model(model_name: String) -> Result<(), String> {
    let client = reqwest::Client::new();

    client
        .delete("http://localhost:11434/api/delete")
        .json(&serde_json::json!({ "name": model_name }))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn ollama_chat(
    model: String,
    messages: Vec<serde_json::Value>,
    options: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();

    let mut body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": false,
    });

    if let Some(opts) = options {
        body["options"] = opts;
    }

    let response = client
        .post("http://localhost:11434/api/chat")
        .json(&body)
        .timeout(std::time::Duration::from_secs(300))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json = response.json().await.map_err(|e| e.to_string())?;

    Ok(json)
}

#[tauri::command]
pub async fn lmstudio_check_status() -> Result<LMStudioStatus, String> {
    let client = reqwest::Client::new();

    let response = client
        .get("http://localhost:1234/v1/models")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await;

    match response {
        Ok(resp) => {
            let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            
            let models = json
                .get("data")
                .and_then(|d| d.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|m| serde_json::from_value(m.clone()).ok())
                        .collect()
                })
                .unwrap_or_default();

            Ok(LMStudioStatus {
                running: true,
                version: None,
                models,
            })
        }
        Err(_) => Ok(LMStudioStatus {
            running: false,
            version: None,
            models: Vec::new(),
        }),
    }
}

#[tauri::command]
pub async fn lmstudio_get_models() -> Result<Vec<LMStudioModel>, String> {
    let client = reqwest::Client::new();

    let response = client
        .get("http://localhost:1234/v1/models")
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    let models = json
        .get("data")
        .and_then(|d| d.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| serde_json::from_value(m.clone()).ok())
                .collect()
        })
        .unwrap_or_default();

    Ok(models)
}

#[tauri::command]
pub async fn check_local_service(
    provider: String,
    host: String,
    port: u16,
) -> Result<LocalServiceStatus, String> {
    let client = reqwest::Client::new();
    
    let (url, models_url) = match provider.as_str() {
        "ollama" => {
            let base = format!("http://{}:{}", host, port);
            (format!("{}/api/version", base), format!("{}/api/tags", base))
        }
        "lmstudio" => {
            let base = format!("http://{}:{}", host, port);
            (format!("{}/v1/models", base), format!("{}/v1/models", base))
        }
        _ => {
            let base = format!("http://{}:{}", host, port);
            (format!("{}/v1/models", base), format!("{}/v1/models", base))
        }
    };

    let response = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await;

    match response {
        Ok(resp) => {
            let version = if provider == "ollama" {
                match resp.json::<serde_json::Value>().await {
                    Ok(v) => v.get("version").and_then(|v| v.as_str().map(|s| s.to_string())),
                    Err(_) => None,
                }
            } else {
                None
            };

            let models_count = if provider == "ollama" {
                match client
                    .get(&models_url)
                    .timeout(std::time::Duration::from_secs(5))
                    .send()
                    .await
                {
                    Ok(r) => {
                        match r.json::<serde_json::Value>().await {
                            Ok(j) => j.get("models")
                                .and_then(|m| m.as_array())
                                .map(|a| a.len() as u32)
                                .unwrap_or(0),
                            Err(_) => 0,
                        }
                    }
                    Err(_) => 0,
                }
            } else {
                match client
                    .get(&models_url)
                    .timeout(std::time::Duration::from_secs(5))
                    .send()
                    .await
                {
                    Ok(r) => {
                        match r.json::<serde_json::Value>().await {
                            Ok(j) => j.get("data")
                                .and_then(|d| d.as_array())
                                .map(|a| a.len() as u32)
                                .unwrap_or(0),
                            Err(_) => 0,
                        }
                    }
                    Err(_) => 0,
                }
            };

            Ok(LocalServiceStatus {
                provider,
                running: true,
                host,
                port,
                version,
                models_count,
            })
        }
        Err(_) => Ok(LocalServiceStatus {
            provider,
            running: false,
            host,
            port,
            version: None,
            models_count: 0,
        }),
    }
}
