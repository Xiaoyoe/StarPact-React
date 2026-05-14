use rusqlite::{Connection, params, OptionalExtension};
use std::sync::{Mutex, OnceLock};
use crate::models::{ModelConfig, Conversation, ModelStats, LocalServiceConfig, Wallpaper, ImageAlbum, ImageMetadata, ChatMessage};
use super::paths::get_database_path;

static DATABASE: OnceLock<Database> = OnceLock::new();

pub struct Database {
    conn: Mutex<Connection>,
}

pub fn get_database() -> &'static Database {
    DATABASE.get_or_init(|| {
        Database::new().expect("Failed to initialize database")
    })
}

impl Database {
    pub fn new() -> Result<Self, String> {
        let db_path = get_database_path();
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;
        
        let db = Database {
            conn: Mutex::new(conn),
        };
        
        db.initialize_tables()?;
        Ok(db)
    }
    
    fn initialize_tables(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        conn.execute_batch(r#"
            -- 首先创建 settings 表（用于迁移）
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
            
            CREATE TABLE IF NOT EXISTS model_configs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                provider TEXT NOT NULL,
                type TEXT NOT NULL,
                api_url TEXT NOT NULL,
                api_key TEXT,
                model TEXT NOT NULL,
                max_tokens INTEGER DEFAULT 4096,
                temperature REAL DEFAULT 0.7,
                top_p REAL DEFAULT 0.9,
                "group" TEXT DEFAULT 'default',
                is_favorite INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                total_calls INTEGER DEFAULT 0,
                success_calls INTEGER DEFAULT 0,
                avg_response_time REAL DEFAULT 0.0,
                last_used INTEGER,
                local_provider TEXT,
                local_service_host TEXT,
                local_service_port INTEGER,
                local_service_base_url TEXT,
                supports_vision INTEGER,
                supports_streaming INTEGER
            );
            
            CREATE TABLE IF NOT EXISTS model_presets (
                id TEXT PRIMARY KEY,
                model_id TEXT NOT NULL,
                name TEXT NOT NULL,
                temperature REAL DEFAULT 0.7,
                top_p REAL DEFAULT 0.9,
                max_tokens INTEGER DEFAULT 4096,
                FOREIGN KEY (model_id) REFERENCES model_configs(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                model_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_favorite INTEGER DEFAULT 0,
                total_tokens INTEGER DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                model_id TEXT,
                model_name TEXT,
                is_streaming INTEGER DEFAULT 0,
                is_favorite INTEGER DEFAULT 0,
                thinking TEXT,
                show_thinking INTEGER DEFAULT 0,
                thinking_duration INTEGER,
                images TEXT,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS ffmpeg_tasks (
                id TEXT PRIMARY KEY,
                file_name TEXT NOT NULL,
                module TEXT NOT NULL,
                status TEXT NOT NULL,
                progress INTEGER DEFAULT 0,
                input_path TEXT NOT NULL,
                output_path TEXT NOT NULL,
                start_time INTEGER NOT NULL,
                end_time INTEGER,
                error TEXT,
                logs TEXT
            );
            
            CREATE TABLE IF NOT EXISTS prompt_templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT DEFAULT 'custom',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_favorite INTEGER DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS image_albums (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                cover_image_id TEXT,
                description TEXT
            );
            
            CREATE TABLE IF NOT EXISTS images (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                size INTEGER NOT NULL,
                type TEXT NOT NULL,
                file_path TEXT NOT NULL,
                width INTEGER DEFAULT 0,
                height INTEGER DEFAULT 0,
                added_at INTEGER NOT NULL,
                tags TEXT,
                description TEXT,
                thumbnail_path TEXT,
                favorite INTEGER DEFAULT 0,
                album_id TEXT NOT NULL,
                FOREIGN KEY (album_id) REFERENCES image_albums(id) ON DELETE CASCADE
            );
            
            CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_images_album ON images(album_id);
            CREATE INDEX IF NOT EXISTS idx_images_added ON images(added_at DESC);
            
            CREATE TABLE IF NOT EXISTS wallpapers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                size INTEGER DEFAULT 0,
                added_at INTEGER NOT NULL,
                is_active INTEGER DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS video_playlists (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS video_items (
                id TEXT PRIMARY KEY,
                playlist_id TEXT NOT NULL,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                duration INTEGER DEFAULT 0,
                size INTEGER DEFAULT 0,
                added_at INTEGER NOT NULL,
                position INTEGER DEFAULT 0,
                FOREIGN KEY (playlist_id) REFERENCES video_playlists(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS web_shortcuts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                icon TEXT,
                category TEXT DEFAULT 'default',
                created_at INTEGER NOT NULL,
                is_favorite INTEGER DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS logs (
                id TEXT PRIMARY KEY,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                source TEXT,
                timestamp INTEGER NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS text_contrast_files (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                side TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS ini_configs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS prompt_template_results (
                id TEXT PRIMARY KEY,
                template_id TEXT NOT NULL,
                type TEXT NOT NULL,
                content TEXT NOT NULL,
                version_note TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (template_id) REFERENCES prompt_templates(id) ON DELETE CASCADE
            );
        "#).map_err(|e| format!("Failed to initialize tables: {}", e))?;
        
        // 执行数据库迁移
        self.run_migrations(&conn)?;
        
        Ok(())
    }
    
    fn run_migrations(&self, conn: &Connection) -> Result<(), String> {
        // 先插入迁移标记（如果不存在）
        conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('col_local_provider_added', '0')", [])
            .ok();
        conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('col_local_service_host_added', '0')", [])
            .ok();
        conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('col_local_service_port_added', '0')", [])
            .ok();
        conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('col_local_service_base_url_added', '0')", [])
            .ok();
        conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('col_supports_vision_added', '0')", [])
            .ok();
        conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('col_supports_streaming_added', '0')", [])
            .ok();
        
        // 添加 local_provider 列
        let local_provider_added: bool = conn.query_row(
            "SELECT value FROM settings WHERE key = 'col_local_provider_added'",
            [],
            |row| row.get::<_, String>(0)
        ).unwrap_or_else(|_| "0".to_string()) == "1";
        
        if !local_provider_added {
            conn.execute("ALTER TABLE model_configs ADD COLUMN local_provider TEXT", [])
                .ok();
            conn.execute("UPDATE settings SET value = '1' WHERE key = 'col_local_provider_added'", [])
                .map_err(|e| e.to_string())?;
        }
        
        // 添加 local_service_host 列
        let local_service_host_added: bool = conn.query_row(
            "SELECT value FROM settings WHERE key = 'col_local_service_host_added'",
            [],
            |row| row.get::<_, String>(0)
        ).unwrap_or_else(|_| "0".to_string()) == "1";
        
        if !local_service_host_added {
            conn.execute("ALTER TABLE model_configs ADD COLUMN local_service_host TEXT", [])
                .ok();
            conn.execute("UPDATE settings SET value = '1' WHERE key = 'col_local_service_host_added'", [])
                .map_err(|e| e.to_string())?;
        }
        
        // 添加 local_service_port 列
        let local_service_port_added: bool = conn.query_row(
            "SELECT value FROM settings WHERE key = 'col_local_service_port_added'",
            [],
            |row| row.get::<_, String>(0)
        ).unwrap_or_else(|_| "0".to_string()) == "1";
        
        if !local_service_port_added {
            conn.execute("ALTER TABLE model_configs ADD COLUMN local_service_port INTEGER", [])
                .ok();
            conn.execute("UPDATE settings SET value = '1' WHERE key = 'col_local_service_port_added'", [])
                .map_err(|e| e.to_string())?;
        }
        
        // 添加 local_service_base_url 列
        let local_service_base_url_added: bool = conn.query_row(
            "SELECT value FROM settings WHERE key = 'col_local_service_base_url_added'",
            [],
            |row| row.get::<_, String>(0)
        ).unwrap_or_else(|_| "0".to_string()) == "1";
        
        if !local_service_base_url_added {
            conn.execute("ALTER TABLE model_configs ADD COLUMN local_service_base_url TEXT", [])
                .ok();
            conn.execute("UPDATE settings SET value = '1' WHERE key = 'col_local_service_base_url_added'", [])
                .map_err(|e| e.to_string())?;
        }
        
        // 添加 supports_vision 列
        let supports_vision_added: bool = conn.query_row(
            "SELECT value FROM settings WHERE key = 'col_supports_vision_added'",
            [],
            |row| row.get::<_, String>(0)
        ).unwrap_or_else(|_| "0".to_string()) == "1";
        
        if !supports_vision_added {
            conn.execute("ALTER TABLE model_configs ADD COLUMN supports_vision INTEGER", [])
                .ok();
            conn.execute("UPDATE settings SET value = '1' WHERE key = 'col_supports_vision_added'", [])
                .map_err(|e| e.to_string())?;
        }
        
        // 添加 supports_streaming 列
        let supports_streaming_added: bool = conn.query_row(
            "SELECT value FROM settings WHERE key = 'col_supports_streaming_added'",
            [],
            |row| row.get::<_, String>(0)
        ).unwrap_or_else(|_| "0".to_string()) == "1";
        
        if !supports_streaming_added {
            conn.execute("ALTER TABLE model_configs ADD COLUMN supports_streaming INTEGER", [])
                .ok();
            conn.execute("UPDATE settings SET value = '1' WHERE key = 'col_supports_streaming_added'", [])
                .map_err(|e| e.to_string())?;
        }
        
        Ok(())
    }
    
    pub fn get_models(&self) -> Result<Vec<ModelConfig>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        let mut stmt = conn.prepare(r#"
            SELECT id, name, provider, type, api_url, api_key, model, max_tokens, 
                   temperature, top_p, "group", is_favorite, is_active, created_at,
                   total_calls, success_calls, avg_response_time, last_used,
                   local_provider, local_service_host, local_service_port, local_service_base_url,
                   supports_vision, supports_streaming
            FROM model_configs
            ORDER BY created_at DESC
        "#).map_err(|e| e.to_string())?;
        
        let models = stmt.query_map([], |row| {
            let local_provider: Option<String> = row.get(18)?;
            let local_service_host: Option<String> = row.get(19)?;
            let local_service_port: Option<u16> = row.get(20)?;
            let local_service_base_url: Option<String> = row.get(21)?;
            
            let local_service_config = if let (Some(provider), Some(host), Some(port), Some(base_url)) = 
                (local_provider.clone(), local_service_host, local_service_port, local_service_base_url) {
                Some(LocalServiceConfig {
                    provider,
                    host,
                    port,
                    base_url,
                })
            } else {
                None
            };
            
            Ok(ModelConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                provider: row.get(2)?,
                model_type: row.get(3)?,
                api_url: row.get(4)?,
                api_key: row.get(5)?,
                model: row.get(6)?,
                max_tokens: row.get(7)?,
                temperature: row.get(8)?,
                top_p: row.get(9)?,
                group: row.get(10)?,
                is_favorite: row.get::<_, i32>(11)? == 1,
                is_active: row.get::<_, i32>(12)? == 1,
                created_at: row.get(13)?,
                presets: vec![],
                stats: ModelStats {
                    total_calls: row.get::<_, u32>(14)?,
                    success_calls: row.get::<_, u32>(15)?,
                    avg_response_time: row.get(16)?,
                    last_used: row.get(17)?,
                },
                local_provider,
                local_service_config,
                supports_vision: row.get::<_, Option<i32>>(22)?.map(|v| v == 1),
                supports_streaming: row.get::<_, Option<i32>>(23)?.map(|v| v == 1),
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        
        Ok(models)
    }
    
    pub fn save_models(&self, models: Vec<ModelConfig>) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        conn.execute("DELETE FROM model_configs", [])
            .map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM model_presets", [])
            .map_err(|e| e.to_string())?;
        
        for model in models {
            let (local_provider, local_host, local_port, local_base_url) = 
                if let Some(config) = &model.local_service_config {
                    (Some(config.provider.clone()), Some(config.host.clone()), Some(config.port), Some(config.base_url.clone()))
                } else {
                    (model.local_provider.clone(), None, None, None)
                };
            
            conn.execute(r#"
                INSERT INTO model_configs 
                (id, name, provider, type, api_url, api_key, model, max_tokens, 
                 temperature, top_p, "group", is_favorite, is_active, created_at,
                 total_calls, success_calls, avg_response_time, last_used,
                 local_provider, local_service_host, local_service_port, local_service_base_url,
                 supports_vision, supports_streaming)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24)
            "#, params![
                model.id,
                model.name,
                model.provider,
                model.model_type,
                model.api_url,
                model.api_key,
                model.model,
                model.max_tokens,
                model.temperature,
                model.top_p,
                model.group,
                if model.is_favorite { 1 } else { 0 },
                if model.is_active { 1 } else { 0 },
                model.created_at,
                model.stats.total_calls,
                model.stats.success_calls,
                model.stats.avg_response_time,
                model.stats.last_used,
                local_provider,
                local_host,
                local_port,
                local_base_url,
                model.supports_vision.map(|v| if v { 1 } else { 0 }),
                model.supports_streaming.map(|v| if v { 1 } else { 0 }),
            ]).map_err(|e| e.to_string())?;
            
            for preset in model.presets {
                conn.execute(r#"
                    INSERT INTO model_presets 
                    (id, model_id, name, temperature, top_p, max_tokens)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                "#, params![
                    preset.id,
                    model.id,
                    preset.name,
                    preset.temperature,
                    preset.top_p,
                    preset.max_tokens,
                ]).map_err(|e| e.to_string())?;
            }
        }
        
        Ok(())
    }
    
    pub fn get_conversations(&self) -> Result<Vec<Conversation>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        let mut stmt = conn.prepare(r#"
            SELECT id, title, model_id, created_at, updated_at, is_favorite, total_tokens
            FROM conversations
            ORDER BY updated_at DESC
        "#).map_err(|e| e.to_string())?;
        
        let conversations = stmt.query_map([], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                model_id: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                is_favorite: row.get::<_, i32>(5)? == 1,
                total_tokens: row.get(6)?,
                messages: vec![],
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        
        let mut result = Vec::new();
        for mut conv in conversations {
            let mut msg_stmt = conn.prepare(r#"
                SELECT id, role, content, timestamp, model_id, model_name, 
                       is_streaming, is_favorite, thinking, show_thinking, thinking_duration, images
                FROM chat_messages
                WHERE conversation_id = ?1
                ORDER BY timestamp ASC
            "#).map_err(|e| e.to_string())?;
            
            let messages = msg_stmt.query_map(params![conv.id], |row| {
                let images_json: Option<String> = row.get(11)?;
                let images = images_json.and_then(|json| {
                    serde_json::from_str(&json).ok()
                });
                
                Ok(ChatMessage {
                    id: row.get(0)?,
                    role: row.get(1)?,
                    content: row.get(2)?,
                    timestamp: row.get(3)?,
                    model_id: row.get(4)?,
                    model_name: row.get(5)?,
                    is_streaming: Some(row.get::<_, i32>(6)? == 1),
                    is_favorite: Some(row.get::<_, i32>(7)? == 1),
                    thinking: row.get(8)?,
                    show_thinking: Some(row.get::<_, i32>(9)? == 1),
                    thinking_duration: row.get(10)?,
                    images,
                })
            }).map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
            
            conv.messages = messages;
            result.push(conv);
        }
        
        Ok(result)
    }
    
    pub fn save_conversations(&self, conversations: Vec<Conversation>) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        conn.execute("DELETE FROM conversations", [])
            .map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM chat_messages", [])
            .map_err(|e| e.to_string())?;
        
        for conv in conversations {
            conn.execute(r#"
                INSERT INTO conversations 
                (id, title, model_id, created_at, updated_at, is_favorite, total_tokens)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#, params![
                conv.id,
                conv.title,
                conv.model_id,
                conv.created_at,
                conv.updated_at,
                if conv.is_favorite { 1 } else { 0 },
                conv.total_tokens,
            ]).map_err(|e| e.to_string())?;
            
            for msg in conv.messages {
                let images_json = msg.images.as_ref().and_then(|imgs| {
                    if imgs.is_empty() {
                        None
                    } else {
                        serde_json::to_string(imgs).ok()
                    }
                });
                
                conn.execute(r#"
                    INSERT INTO chat_messages 
                    (id, conversation_id, role, content, timestamp, model_id, model_name, 
                     is_streaming, is_favorite, thinking, show_thinking, thinking_duration, images)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
                "#, params![
                    msg.id,
                    conv.id,
                    msg.role,
                    msg.content,
                    msg.timestamp,
                    msg.model_id,
                    msg.model_name,
                    if msg.is_streaming.unwrap_or(false) { 1 } else { 0 },
                    if msg.is_favorite.unwrap_or(false) { 1 } else { 0 },
                    msg.thinking,
                    if msg.show_thinking.unwrap_or(false) { 1 } else { 0 },
                    msg.thinking_duration,
                    images_json,
                ]).map_err(|e| e.to_string())?;
            }
        }
        
        Ok(())
    }
    
    #[allow(dead_code)]
    pub fn get_wallpapers(&self) -> Result<Vec<Wallpaper>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        let mut stmt = conn.prepare(r#"
            SELECT id, name, file_path, size, added_at, is_active
            FROM wallpapers
            ORDER BY added_at DESC
        "#).map_err(|e| e.to_string())?;
        
        let wallpapers = stmt.query_map([], |row| {
            Ok(Wallpaper {
                id: row.get(0)?,
                name: row.get(1)?,
                file_path: row.get(2)?,
                size: row.get(3)?,
                added_at: row.get(4)?,
                is_active: row.get::<_, i32>(5)? == 1,
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        
        Ok(wallpapers)
    }
    
    #[allow(dead_code)]
    pub fn save_wallpapers(&self, wallpapers: Vec<Wallpaper>) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        conn.execute("DELETE FROM wallpapers", [])
            .map_err(|e| e.to_string())?;
        
        for wallpaper in wallpapers {
            conn.execute(r#"
                INSERT INTO wallpapers 
                (id, name, file_path, size, added_at, is_active)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            "#, params![
                wallpaper.id,
                wallpaper.name,
                wallpaper.file_path,
                wallpaper.size,
                wallpaper.added_at,
                if wallpaper.is_active { 1 } else { 0 },
            ]).map_err(|e| e.to_string())?;
        }
        
        Ok(())
    }
    
    #[allow(dead_code)]
    pub fn get_active_wallpaper(&self) -> Result<Option<Wallpaper>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        let mut stmt = conn.prepare(r#"
            SELECT id, name, file_path, size, added_at, is_active
            FROM wallpapers
            WHERE is_active = 1
            LIMIT 1
        "#).map_err(|e| e.to_string())?;
        
        let result = stmt.query_row([], |row| {
            Ok(Wallpaper {
                id: row.get(0)?,
                name: row.get(1)?,
                file_path: row.get(2)?,
                size: row.get(3)?,
                added_at: row.get(4)?,
                is_active: row.get::<_, i32>(5)? == 1,
            })
        }).optional().map_err(|e| e.to_string())?;
        
        Ok(result)
    }
    
    #[allow(dead_code)]
    pub fn set_active_wallpaper(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        conn.execute("UPDATE wallpapers SET is_active = 0", [])
            .map_err(|e| e.to_string())?;
        
        conn.execute("UPDATE wallpapers SET is_active = 1 WHERE id = ?1", [id])
            .map_err(|e| e.to_string())?;
        
        Ok(())
    }
    
    #[allow(dead_code)]
    pub fn add_wallpaper(&self, wallpaper: Wallpaper) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        conn.execute(r#"
            INSERT INTO wallpapers 
            (id, name, file_path, size, added_at, is_active)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        "#, params![
            wallpaper.id,
            wallpaper.name,
            wallpaper.file_path,
            wallpaper.size,
            wallpaper.added_at,
            if wallpaper.is_active { 1 } else { 0 },
        ]).map_err(|e| e.to_string())?;
        
        Ok(())
    }
    
    #[allow(dead_code)]
    pub fn delete_wallpaper(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        conn.execute("DELETE FROM wallpapers WHERE id = ?1", [id])
            .map_err(|e| e.to_string())?;
        
        Ok(())
    }
    
    #[allow(dead_code)]
    pub fn clear_all_wallpapers(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        conn.execute("DELETE FROM wallpapers", [])
            .map_err(|e| e.to_string())?;
        
        Ok(())
    }
    
    #[allow(dead_code)]
    pub fn clear_active_wallpaper(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        conn.execute("UPDATE wallpapers SET is_active = 0", [])
            .map_err(|e| e.to_string())?;
        
        Ok(())
    }
    
    pub fn get_albums(&self) -> Result<Vec<ImageAlbum>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        let mut stmt = conn.prepare(r#"
            SELECT a.id, a.name, a.created_at, a.updated_at, a.cover_image_id, a.description,
                   COALESCE(COUNT(i.id), 0) as image_count
            FROM image_albums a
            LEFT JOIN images i ON a.id = i.album_id
            GROUP BY a.id
            ORDER BY a.created_at DESC
        "#).map_err(|e| e.to_string())?;
        
        let albums = stmt.query_map([], |row| {
            Ok(ImageAlbum {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                cover_image_id: row.get(4)?,
                description: row.get(5)?,
                image_count: row.get::<_, i64>(6)? as u32,
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        
        Ok(albums)
    }
    
    pub fn get_album_by_id(&self, id: &str) -> Result<Option<ImageAlbum>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        let mut stmt = conn.prepare(r#"
            SELECT a.id, a.name, a.created_at, a.updated_at, a.cover_image_id, a.description,
                   COALESCE(COUNT(i.id), 0) as image_count
            FROM image_albums a
            LEFT JOIN images i ON a.id = i.album_id
            WHERE a.id = ?1
            GROUP BY a.id
        "#).map_err(|e| e.to_string())?;
        
        let result = stmt.query_row([id], |row| {
            Ok(ImageAlbum {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                cover_image_id: row.get(4)?,
                description: row.get(5)?,
                image_count: row.get::<_, i64>(6)? as u32,
            })
        }).optional().map_err(|e| e.to_string())?;
        
        Ok(result)
    }
    
    pub fn save_album(&self, album: &ImageAlbum) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        conn.execute(r#"
            INSERT OR REPLACE INTO image_albums 
            (id, name, created_at, updated_at, cover_image_id, description)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        "#, params![
            album.id,
            album.name,
            album.created_at,
            album.updated_at,
            album.cover_image_id,
            album.description,
        ]).map_err(|e| e.to_string())?;
        
        Ok(())
    }
    
    pub fn delete_album(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        conn.execute("DELETE FROM image_albums WHERE id = ?1", [id])
            .map_err(|e| e.to_string())?;
        
        Ok(())
    }
    
    pub fn get_images(&self, album_id: &str) -> Result<Vec<ImageMetadata>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        let mut stmt = conn.prepare(r#"
            SELECT id, name, size, type, file_path, width, height, added_at, tags, description, thumbnail_path, favorite, album_id
            FROM images
            WHERE album_id = ?1
            ORDER BY added_at DESC
        "#).map_err(|e| e.to_string())?;
        
        let images = stmt.query_map([album_id], |row| {
            let tags_str: Option<String> = row.get(8)?;
            let tags = tags_str.and_then(|s| serde_json::from_str(&s).ok());
            
            Ok(ImageMetadata {
                id: row.get(0)?,
                name: row.get(1)?,
                size: row.get(2)?,
                image_type: row.get(3)?,
                file_path: row.get(4)?,
                width: row.get(5)?,
                height: row.get(6)?,
                added_at: row.get(7)?,
                tags,
                description: row.get(9)?,
                thumbnail_path: row.get(10)?,
                favorite: row.get::<_, Option<i32>>(11)?.map(|v| v == 1),
                album_id: row.get(12)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        
        Ok(images)
    }
    
    #[allow(dead_code)]
    pub fn get_all_videos(&self) -> Result<Vec<crate::models::VideoFile>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        let mut stmt = conn.prepare(r#"
            SELECT path, name, size, duration
            FROM video_items
            ORDER BY name
        "#).map_err(|e| e.to_string())?;
        
        let videos = stmt.query_map([], |row| {
            Ok(crate::models::VideoFile {
                path: row.get::<_, String>(0)?,
                name: row.get::<_, String>(1)?,
                size: row.get::<_, i64>(2)? as u64,
                duration: row.get::<_, i64>(3)? as f64,
                width: 0,
                height: 0,
                codec: String::new(),
                fps: 0.0,
                bitrate: 0,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        
        Ok(videos)
    }
    
    pub fn get_all_images(&self) -> Result<Vec<ImageMetadata>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        let mut stmt = conn.prepare(r#"
            SELECT id, name, size, type, file_path, width, height, added_at, tags, description, thumbnail_path, favorite, album_id
            FROM images
            ORDER BY added_at DESC
        "#).map_err(|e| e.to_string())?;
        
        let images = stmt.query_map([], |row| {
            let tags_str: Option<String> = row.get(8)?;
            let tags = tags_str.and_then(|s| serde_json::from_str(&s).ok());
            
            Ok(ImageMetadata {
                id: row.get(0)?,
                name: row.get(1)?,
                size: row.get(2)?,
                image_type: row.get(3)?,
                file_path: row.get(4)?,
                width: row.get(5)?,
                height: row.get(6)?,
                added_at: row.get(7)?,
                tags,
                description: row.get(9)?,
                thumbnail_path: row.get(10)?,
                favorite: row.get::<_, Option<i32>>(11)?.map(|v| v == 1),
                album_id: row.get(12)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        
        Ok(images)
    }
    
    pub fn save_image(&self, image: &ImageMetadata) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        let tags_json = image.tags.as_ref().and_then(|t| serde_json::to_string(t).ok());
        
        conn.execute(r#"
            INSERT OR REPLACE INTO images 
            (id, name, size, type, file_path, width, height, added_at, tags, description, thumbnail_path, favorite, album_id)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        "#, params![
            image.id,
            image.name,
            image.size,
            image.image_type,
            image.file_path,
            image.width,
            image.height,
            image.added_at,
            tags_json,
            image.description,
            image.thumbnail_path,
            image.favorite.map(|v| if v { 1 } else { 0 }),
            image.album_id,
        ]).map_err(|e| e.to_string())?;
        
        Ok(())
    }
    
    pub fn delete_image(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        conn.execute("DELETE FROM images WHERE id = ?1", [id])
            .map_err(|e| e.to_string())?;
        
        Ok(())
    }
    
    pub fn update_image_favorite(&self, id: &str, favorite: bool) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        conn.execute("UPDATE images SET favorite = ?1 WHERE id = ?2", params![if favorite { 1 } else { 0 }, id])
            .map_err(|e| e.to_string())?;
        
        Ok(())
    }
    
    pub fn clear_all_data(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        
        conn.execute_batch(r#"
            DELETE FROM model_configs;
            DELETE FROM model_presets;
            DELETE FROM conversations;
            DELETE FROM chat_messages;
            DELETE FROM ffmpeg_tasks;
            DELETE FROM prompt_templates;
            DELETE FROM image_albums;
            DELETE FROM images;
            DELETE FROM wallpapers;
            DELETE FROM video_playlists;
            DELETE FROM video_items;
            DELETE FROM web_shortcuts;
            DELETE FROM logs;
            DELETE FROM text_contrast_files;
            DELETE FROM ini_configs;
            DELETE FROM prompt_template_results;
        "#).map_err(|e| e.to_string())?;
        
        Ok(())
    }
}
