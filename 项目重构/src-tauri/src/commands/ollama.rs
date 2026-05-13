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
pub async fn ollama_get_models_with_addr(host: String, port: u16) -> Result<Vec<OllamaModel>, String> {
    let client = reqwest::Client::new();
    let url = format!("http://{}:{}/api/tags", host, port);

    let response = client
        .get(&url)
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
pub async fn ollama_pull_model_with_addr(
    host: String, 
    port: u16, 
    model_name: String, 
    app: tauri::AppHandle
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("http://{}:{}/api/pull", host, port);

    let response = client
        .post(&url)
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
pub async fn ollama_delete_model_with_addr(host: String, port: u16, model_name: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("http://{}:{}/api/delete", host, port);

    client
        .delete(&url)
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
pub async fn ollama_show_model(model_name: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();

    let response = client
        .post("http://localhost:11434/api/show")
        .json(&serde_json::json!({ "name": model_name }))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json = response.json().await.map_err(|e| e.to_string())?;
    Ok(json)
}

#[tauri::command]
pub async fn ollama_show_model_with_addr(host: String, port: u16, model_name: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let url = format!("http://{}:{}/api/show", host, port);

    let response = client
        .post(&url)
        .json(&serde_json::json!({ "name": model_name }))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json = response.json().await.map_err(|e| e.to_string())?;
    Ok(json)
}

#[tauri::command]
pub async fn ollama_run_model(model_name: String) -> Result<(), String> {
    let client = reqwest::Client::new();

    let response = client
        .post("http://localhost:11434/api/generate")
        .json(&serde_json::json!({ 
            "model": model_name,
            "prompt": "",
            "keep_alive": "5m"
        }))
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let _ = response.bytes().await;
    Ok(())
}

#[tauri::command]
pub async fn ollama_run_model_with_addr(host: String, port: u16, model_name: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("http://{}:{}/api/generate", host, port);

    let response = client
        .post(&url)
        .json(&serde_json::json!({ 
            "model": model_name,
            "prompt": "",
            "keep_alive": "5m"
        }))
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let _ = response.bytes().await;
    Ok(())
}

#[tauri::command]
pub async fn ollama_stop_model(model_name: String) -> Result<(), String> {
    let client = reqwest::Client::new();

    client
        .post("http://localhost:11434/api/generate")
        .json(&serde_json::json!({ 
            "model": model_name,
            "keep_alive": 0
        }))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn ollama_stop_model_with_addr(host: String, port: u16, model_name: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("http://{}:{}/api/generate", host, port);

    client
        .post(&url)
        .json(&serde_json::json!({ 
            "model": model_name,
            "keep_alive": 0
        }))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn ollama_ps(host: String, port: u16) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let url = format!("http://{}:{}/api/ps", host, port);

    let response = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
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
pub async fn lmstudio_get_models_with_addr(host: String, port: u16) -> Result<Vec<LMStudioModel>, String> {
    let client = reqwest::Client::new();
    let url = format!("http://{}:{}/v1/models", host, port);

    let response = client
        .get(&url)
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

#[tauri::command]
pub async fn stream_ollama_chat(
    request: serde_json::Value,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    
    let url = request.get("url")
        .and_then(|u| u.as_str())
        .unwrap_or("http://localhost:11434/api/chat");
    
    let mut body = request.clone();
    if body.get("url").is_some() {
        body.as_object_mut().map(|obj| obj.remove("url"));
    }
    
    let response = client
        .post(url)
        .json(&body)
        .timeout(std::time::Duration::from_secs(600))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    use futures_util::StreamExt;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        if let Ok(chunk) = chunk {
            if let Ok(text) = std::str::from_utf8(&chunk) {
                for line in text.lines() {
                    if line.is_empty() {
                        continue;
                    }
                    if let Ok(event) = serde_json::from_str::<serde_json::Value>(line) {
                        let _ = app.emit("ollama:chat_event", &event);
                    }
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn stream_remote_chat(
    url: String,
    api_key: Option<String>,
    request: serde_json::Value,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    
    let mut req = client
        .post(&url)
        .json(&request)
        .timeout(std::time::Duration::from_secs(600));
    
    if let Some(key) = api_key {
        req = req.header("Authorization", format!("Bearer {}", key));
    }
    
    let response = req
        .send()
        .await
        .map_err(|e| e.to_string())?;

    use futures_util::StreamExt;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        if let Ok(chunk) = chunk {
            if let Ok(text) = std::str::from_utf8(&chunk) {
                for line in text.lines() {
                    if line.is_empty() || !line.starts_with("data: ") {
                        continue;
                    }
                    let data = &line[6..];
                    if data == "[DONE]" {
                        let _ = app.emit("remote:chat_event", &serde_json::json!({ "done": true }));
                        break;
                    }
                    if let Ok(event) = serde_json::from_str::<serde_json::Value>(data) {
                        let _ = app.emit("remote:chat_event", &event);
                    }
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn test_ollama_connection(model: String) -> Result<bool, String> {
    let client = reqwest::Client::new();
    
    let response = client
        .post("http://localhost:11434/api/generate")
        .json(&serde_json::json!({
            "model": model,
            "prompt": "Hi",
            "stream": false
        }))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await;
    
    Ok(response.is_ok())
}

#[tauri::command]
pub async fn test_remote_connection(
    url: String,
    api_key: Option<String>,
    model: String,
) -> Result<bool, String> {
    let client = reqwest::Client::new();
    
    let mut req = client
        .post(&url)
        .json(&serde_json::json!({
            "model": model,
            "messages": [{"role": "user", "content": "Hi"}],
            "max_tokens": 10
        }))
        .timeout(std::time::Duration::from_secs(30));
    
    if let Some(key) = api_key {
        req = req.header("Authorization", format!("Bearer {}", key));
    }
    
    let response = req.send().await;
    
    Ok(response.is_ok())
}
