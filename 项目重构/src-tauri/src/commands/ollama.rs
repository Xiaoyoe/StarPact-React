use crate::models::{OllamaModel, OllamaStatus};
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
