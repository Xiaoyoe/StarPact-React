# Starpact 数据目录

此目录为 Starpact 应用的本地数据存储目录，包含所有用户数据和配置。

## 目录结构

```
data/
├── config.json              # 应用全局配置（主题、界面设置、语言等）
├── starpact.db              # SQLite 主数据库
├── images/                  # 图片画廊存储目录
│   ├── album_*/             # 按相册分组的图片
│   └── thumbnails/          # 缩略图缓存
├── videos/                  # 视频缓存目录
│   └── cache/               # 视频处理缓存
├── wallpapers/              # 壁纸存储目录
├── ffmpeg/                  # FFmpeg 相关
│   ├── config/              # FFmpeg 配置
│   └── logs/                # FFmpeg 任务日志
├── backups/                 # 数据备份目录
│   └── backup_*/            # 按时间戳的备份
├── exports/                 # 导出文件目录
│   ├── ini/                 # INI 配置导出
│   └── prompts/             # 提示词导出
└── cache/                   # 临时缓存目录
```

## 数据库表结构 (starpact.db)

### 聊天相关
| 表名 | 说明 |
|------|------|
| `model_configs` | 模型配置（API密钥、参数等） |
| `model_presets` | 模型预设 |
| `conversations` | 对话记录 |
| `chat_messages` | 聊天消息 |

### 媒体相关
| 表名 | 说明 |
|------|------|
| `image_albums` | 图片相册 |
| `images` | 图片元数据 |
| `video_playlists` | 视频播放列表 |
| `video_items` | 视频项 |
| `ffmpeg_tasks` | FFmpeg 任务记录 |

### 工具相关
| 表名 | 说明 |
|------|------|
| `prompt_templates` | 提示词模板 |
| `prompt_template_results` | 模板生成结果 |
| `text_contrast_files` | 文本对比文件 |
| `ini_configs` | INI 配置文件 |
| `web_shortcuts` | 网页快捷方式 |

### 系统相关
| 表名 | 说明 |
|------|------|
| `wallpapers` | 壁纸记录 |
| `logs` | 系统日志 |
| `settings` | 应用设置 |

## 功能页与数据对应关系

| 功能页 | 数据存储 |
|--------|----------|
| 聊天 | `conversations`, `chat_messages`, `model_configs` |
| 模型管理 | `model_configs`, `model_presets` |
| 图片管理 | `image_albums`, `images`, `images/` 目录 |
| 视频播放器 | `video_playlists`, `video_items`, `videos/` 目录 |
| 媒体工具 | `ffmpeg_tasks`, `ffmpeg/` 目录 |
| 提示词模板 | `prompt_templates`, `prompt_template_results` |
| 文本对比 | `text_contrast_files` |
| INI配置 | `ini_configs`, `exports/ini/` |
| 设置 - 壁纸 | `wallpapers`, `wallpapers/` 目录 |
| 设置 - 主题 | `config.json`, `settings` |

## 数据存储方案

### 1. SQLite 数据库
- **文件**: `starpact.db`
- **用途**: 存储结构化数据
- **优势**: 高效查询、事务支持、单文件便于备份

### 2. 文件系统
- **图片**: 存储在 `images/` 目录，按相册分组
- **视频**: 缓存在 `videos/` 目录
- **壁纸**: 存储在 `wallpapers/` 目录
- **导出文件**: 存储在 `exports/` 目录

### 3. JSON 配置
- **config.json**: 应用全局配置
- 支持手动编辑
- 启动时自动读取

## 便携性说明

整个 `data` 目录可以：
- ✅ 完整复制到其他电脑使用
- ✅ 打包备份
- ✅ 通过应用内的备份/恢复功能管理
- ✅ 支持自定义安装路径

## 备份与恢复

### 手动备份
1. 关闭应用程序
2. 复制整个 `data` 目录到安全位置

### 应用内备份
1. 设置 → 数据管理 → 备份数据
2. 选择备份位置
3. 生成带时间戳的备份文件

### 恢复数据
1. 设置 → 数据管理 → 恢复数据
2. 选择备份文件
3. 确认覆盖

## 注意事项

- ⚠️ 请勿手动修改数据库文件，可能导致数据损坏
- ⚠️ 备份前请关闭应用程序
- ⚠️ 首次运行应用时会自动创建此目录结构
- ⚠️ 删除 `cache/` 目录不会影响用户数据
