<div align="center">

# ✨ 星约 Starpact

**多功能智能桌面应用**

*如同星辰之间的约定，连接用户与智能、创意与效率*

[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-28.0.0-47848F?style=flat-square&logo=electron)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.17-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## 📖 目录

- [项目概述](#-项目概述)
- [功能特性](#-功能特性)
- [技术架构](#-技术架构)
- [界面主题](#-界面主题)
- [安装与运行](#-安装与运行)
- [Ollama 集成](#-ollama-集成)
- [存储系统](#-存储系统)
- [开发指南](#-开发指南)
- [常见问题](#-常见问题)
- [更新日志](#-更新日志)

---

## 🌟 项目概述

**星约 (Starpact)** 是一款集成了人工智能对话、媒体处理、数据管理等多种功能于一体的现代化桌面应用程序。

### 核心亮点

| 特性 | 描述 |
|------|------|
| 🤖 **多模型AI对话** | 支持 Ollama 本地模型 + OpenAI/Claude/DeepSeek 等远程 API |
| 🎬 **媒体工具箱** | 基于 FFmpeg 的视频转换、音频处理、图片格式转换 |
| 🎨 **13种精美主题** | 从浅色到深色，从科技蓝到樱花粉，满足个性化需求 |
| 💾 **本地数据存储** | 基于 IndexedDB 的安全本地存储，保护您的隐私 |
| ⚡ **高性能架构** | React 19 + Vite 7 + Electron 28，流畅体验 |

### 技术栈

```
┌─────────────────────────────────────────────────────────────┐
│                        前端核心                               │
│  React 19.2.3  │  TypeScript 5.9.3  │  Vite 7.2.4           │
│  Tailwind CSS  │  Framer Motion     │  Zustand 5.0.11       │
├─────────────────────────────────────────────────────────────┤
│                        桌面应用                               │
│  Electron 28.0.0  │  Electron Builder 24.0.0                │
├─────────────────────────────────────────────────────────────┤
│                        功能依赖                               │
│  React Markdown  │  React Syntax Highlighter  │  Sharp      │
│  Lucide Icons    │  clsx + tailwind-merge      │  uuid      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 功能特性

### 1. 🤖 智能对话系统

星约的核心功能模块，提供强大的人工智能对话能力。

```
┌─────────────────────────────────────────────────────────────┐
│                     智能对话系统                              │
├─────────────────────────────────────────────────────────────┤
│  ◆ 多模型支持                                                │
│    ├─ Ollama 本地模型：保障数据隐私，离线可用                 │
│    ├─ 远程 API：OpenAI、Claude、DeepSeek、通义千问           │
│    └─ 一键切换：满足不同场景需求                              │
│                                                              │
│  ◆ 对话模式                                                  │
│    ├─ 多轮对话：保持上下文连贯                                │
│    ├─ 单轮对话：快速问答                                      │
│    └─ 思考模式：可视化 AI 推理过程                            │
│                                                              │
│  ◆ 流式响应                                                  │
│    ├─ 实时显示：逐字呈现，无需等待                            │
│    ├─ 打字机效果：模拟真实对话                                │
│    └─ 中断控制：随时停止生成                                  │
│                                                              │
│  ◆ 上下文管理                                                │
│    ├─ Token 统计：精确计算上下文长度                          │
│    ├─ 长度配置：1K-131K tokens 范围调节                       │
│    └─ 对话历史：完整记录与管理                                │
│                                                              │
│  ◆ 多媒体支持                                                │
│    ├─ 图片上传：拖拽或点击上传                                │
│    ├─ 图片识别：AI 视觉理解                                   │
│    └─ 壁纸背景：自定义聊天界面                                │
│                                                              │
│  ◆ 性能监控                                                  │
│    ├─ 推理时间统计    ├─ Token 速率显示                       │
│    └─ 内存占用监控    └─ 性能数据可视化                       │
└─────────────────────────────────────────────────────────────┘
```

### 2. 🎛️ 模型管理中心

统一的 AI 模型管理平台。

| 功能模块 | 详细说明 |
|---------|---------|
| **远程模型配置** | OpenAI、Claude、DeepSeek、通义千问、自定义 API |
| **Ollama 管理** | 模型列表、拉取进度、删除模型、详细信息 |
| **状态监控** | 服务在线状态、GPU/CPU/内存占用 |
| **预设配置** | 温度参数、Top-P 采样、最大 Token、系统提示词 |

### 3. 🎬 媒体工具箱

基于 FFmpeg 的强大媒体处理工具集。

```
媒体工具箱
│
├── 📹 视频格式转换
│   ├── 格式支持：MP4、AVI、MKV、MOV、WebM、FLV
│   ├── 编码选择：H.264、H.265、VP9
│   ├── 质量控制：CRF 参数调节
│   └── 分辨率/帧率/比特率调节
│
├── 🎵 音频处理
│   ├── 音频提取：从视频提取音轨
│   ├── 格式转换：MP3、AAC、WAV、FLAC
│   ├── 音质设置：比特率、采样率
│   └── 音量调节、声道处理
│
├── 🔧 高级工具
│   ├── 视频剪辑/合并    ├── GIF 制作
│   ├── 视频压缩         ├── 视频截图
│   └── 水印添加
│
├── 🖼️ 图片格式转换
│   ├── 格式互转：PNG、JPG、WebP、BMP、GIF
│   ├── 质量调节
│   └── 批量处理
│
├── 🎨 ICO 图标转换
│   ├── 多尺寸支持：16x16 ~ 256x256
│   └── 透明度保留
│
└── ⌨️ FFmpeg 命令构建器
    ├── 可视化参数配置
    ├── 命令实时预览
    └── 一键复制命令
```

### 4. 🖼️ 图片画廊

本地图片资源管理工具。

- 📁 图片浏览：网格/列表视图切换
- 🏷️ 相册分类：按文件夹或自定义分类
- 🔍 图片预览：全屏查看大图
- ⬆️ 图片上传：导入本地图片资源

### 5. 📺 视频播放器

内置视频播放功能。

- 🎬 格式支持：MP4、WebM、MKV 等
- ⏯️ 播放控制：播放/暂停/快进/快退
- 🔊 音量调节
- 📺 全屏播放
- 📋 播放列表管理

### 6. 📝 提示词模板库

提示词模板管理系统。

- ✏️ 模板创建与编辑
- 📂 分类管理
- ⚡ 快速插入对话
- 🔍 模板搜索

### 7. 🔍 文本对比工具

专业的文本差异对比工具。

```
┌──────────────────┐     ┌──────────────────┐
│    原始文本       │     │    对比文本       │
│                  │     │                  │
│  差异高亮显示     │ ←→  │  新增/删除/修改   │
│                  │     │  不同颜色标识     │
└──────────────────┘     └──────────────────┘
           ↓
    ┌─────────────────┐
    │    统计信息      │
    │  差异行数/字符数  │
    └─────────────────┘
```

### 8. ⚙️ INI 配置编辑器

INI 格式配置文件编辑工具。

- 📄 文件加载与保存
- 🎨 语法高亮
- ✅ 格式验证
- 📂 节点折叠

### 9. ⚙️ 系统设置

应用程序全局设置中心。

| 设置类别 | 功能项 |
|---------|-------|
| **外观设置** | 主题切换、字体大小、布局模式 |
| **存储设置** | 存储路径、存储监控、数据管理 |
| **对话设置** | 发送方式、默认模型、上下文长度 |
| **FFmpeg 设置** | 可执行文件路径、输出目录 |

### 10. 🔗 网页快捷方式

- ⚡ 快捷访问常用网页
- ⭐ 收藏功能
- 📋 JSON 导入导出
- 🔄 排序功能

### 11. 🔐 开发者模式控制

- 🔒 默认禁用 F12 和右键菜单
- 🔓 设置页面双击解锁
- 💾 状态仅在当前会话有效

---

## 🏗️ 技术架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        渲染进程 (Renderer)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    React 应用层                           │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │   │
│  │  │  Pages  │ │Components│ │  Hooks  │ │  Store  │        │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘        │   │
│  │       └───────────┴──────────┴──────────┘                │   │
│  │                          │                                │   │
│  │  ┌───────────────────────┴───────────────────────┐       │   │
│  │  │              Services 服务层                    │       │   │
│  │  │  Storage │ Ollama │ FFmpeg │ Notification      │       │   │
│  │  └───────────────────────┬───────────────────────┘       │   │
│  └──┼──────────────────────────┼────────────────────────────┼───┘
│     │                          │ IPC通信                     │
│  ┌──┼──────────────────────────┼────────────────────────────┼───┐
│  │  │                    主进程 (Main)                       │   │
│  │  │  ┌───────────────────────┴───────────────────────┐    │   │
│  │  │  │              IPC Handlers 处理器               │    │   │
│  │  │  │  FFmpeg │ File │ Ollama │ Shell │ Storage     │    │   │
│  │  │  └───────────────────────┬───────────────────────┘    │   │
│  │  │                          │                             │   │
│  │  │  ┌───────────────────────┴───────────────────────┐    │   │
│  │  │  │            主进程服务层                         │    │   │
│  │  │  │  FFmpegService │ OllamaService │ WindowManager │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘
```

### 目录结构

```
src/
├── components/          # 公共 UI 组件
│   ├── ffmpeg/         # FFmpeg 相关组件
│   ├── ChatQuickNav/   # 聊天快速导航
│   └── DataManager/    # 数据管理器
├── constants/          # 常量配置
├── hooks/              # 自定义 React Hooks
├── layouts/            # 布局组件
├── main/               # Electron 主进程
│   ├── ipc/           # IPC 通信处理
│   ├── preload/       # 预加载脚本
│   └── services/      # 主进程服务
├── pages/              # 页面组件
│   ├── Chat/          # 智能对话
│   ├── Compare/       # 文本对比
│   ├── Gallery/       # 图片画廊
│   ├── IniConfig/     # INI 配置
│   ├── MediaTools/    # 媒体工具
│   ├── Models/        # 模型管理
│   ├── PromptTemplates/ # 提示词模板
│   ├── Settings/      # 系统设置
│   └── VideoPlayer/   # 视频播放器
├── services/           # 渲染进程服务
│   ├── storage/       # 存储服务
│   └── ffmpeg/        # FFmpeg 服务
├── store/              # Zustand 状态管理
├── styles/             # 样式文件
│   └── themes/        # 主题样式
├── types/              # TypeScript 类型
└── utils/              # 工具函数
```

### 核心组件

| 组件名称 | 功能描述 |
|---------|---------|
| `Sidebar` | 侧边栏导航，对话列表，模型选择 |
| `MessageBubble` | 聊天消息气泡，支持 Markdown 渲染 |
| `MessageList` | 消息列表，虚拟滚动优化 |
| `ChatControlPanel` | 聊天控制面板，参数配置 |
| `ImageViewer` | 图片查看器，支持缩放旋转 |
| `VideoPlayer` | 视频播放器，播放控制 |
| `CodeEditor` | 代码编辑器，语法高亮 |
| `PerformancePanel` | 性能监控面板 |

### 服务层

```
存储服务：
├── IndexedDBStorage      # IndexedDB 底层封装
├── ConfigStorage         # 应用配置存储
├── ChatModelStorage      # 聊天模型存储
├── GalleryStorage        # 图片库存储
├── VideoStorage          # 视频存储
├── PromptTemplateStorage # 提示词模板存储
├── OllamaModelStorage    # Ollama 模型存储
├── FFmpegConfigStorage   # FFmpeg 配置存储
├── StorageManager        # 存储管理器
└── MigrationTool         # 数据迁移工具

业务服务：
├── OllamaModelService    # Ollama 模型管理
├── OllamaPullService     # Ollama 模型拉取
└── FFmpegRendererService # FFmpeg 渲染进程服务
```

---

## 🎨 界面主题

星约提供 **13 种精美主题**，满足不同场景和个人偏好：

| 主题 ID | 主题名称 | 描述 |
|---------|---------|------|
| `light` | 浅色主题 | 经典明亮风格，清爽简洁 |
| `dark` | 深色主题 | 护眼暗色风格，夜间友好 |
| `tech-blue` | 科技蓝 | 专业科技风格，商务大气 |
| `eye-care` | 护眼绿 | 自然舒适风格，长时间使用不疲劳 |
| `midnight-blue` | 午夜蓝 | 深邃沉稳风格 |
| `forest-green` | 森林绿 | 清新自然风格 |
| `coral-orange` | 珊瑚橙 | 活力温暖风格 |
| `lavender-purple` | 薰衣草紫 | 优雅浪漫风格 |
| `mint-cyan` | 薄荷青 | 清凉舒爽风格 |
| `caramel-brown` | 焦糖棕 | 温暖复古风格 |
| `sakura-pink` | 樱花粉 | 甜美可爱风格 |
| `deep-sea-blue` | 深海蓝 | 深邃神秘风格 |
| `amber-gold` | 琥珀金 | 高贵典雅风格 |

**主题特性：**
- 🔄 CSS 变量驱动，实时切换无需刷新
- 🎨 完整的颜色体系：背景、文字、强调色、边框等
- 💻 代码块语法高亮适配
- 📜 滚动条样式适配
- ✨ 动画效果适配

---

## 📥 安装与运行

### 前置要求

- **Node.js 18+**
- **npm 或 yarn**
- **Ollama**（可选）：用于本地 AI 功能
- **FFmpeg**（可选）：用于媒体处理功能

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# Web 开发（仅前端功能）
npm run dev

# Electron 开发（完整功能）
npm run electron:dev
```

### 构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 打包桌面应用

```bash
# 构建所有类型（默认）
npm run electron:build

# 构建 NSIS 安装包
npm run electron:build:nsis

# 构建便携式应用
npm run electron:build:portable
```

**打包输出：**
- 输出目录：`dist-electron/`
- NSIS 安装包：`星约 Setup {版本号}.exe`
- 便携式应用：`星约-Portable-{版本号}.exe`

---

## 🦙 Ollama 集成

### 安装 Ollama

1. 访问 [Ollama 官网](https://ollama.com/download) 下载并安装
2. 确保安装后可以在命令行中使用 `ollama` 命令

### 使用 Ollama 功能

```bash
# 启动 Ollama 服务
ollama serve
```

1. 启动应用后，点击侧边栏底部的 **"Ollama 管理"** 按钮
2. 在弹窗中点击右上角的 **刷新按钮** 检查服务状态
3. 拉取模型：输入模型名称（如 `llama3.2`）并点击"拉取模型"
4. 管理模型：查看、删除已安装的本地模型

### 思考模式控制

- **开启思考模式**：模型会显示思考过程
- **关闭思考模式**：模型直接输出结果

设置会保存到 IndexedDB，重启应用后保持。

### 多模态功能

对于支持多模态的模型（如 llava、moondream）：

1. 点击输入框左侧的文件上传按钮
2. 选择图片文件（支持 JPG、PNG、GIF）
3. 输入文本提示并发送

### 常用模型

| 模型名称 | 描述 |
|---------|------|
| `llama3.2` | Meta 的 Llama 3.2 模型 |
| `qwen2.5` | 阿里通义千问 |
| `mistral` | Mistral AI 模型 |
| `codellama` | 代码专用模型 |
| `llava` | 多模态视觉语言模型 |

---

## 💾 存储系统

### 存储机制

项目使用 **IndexedDB** 作为核心存储机制，结合 Electron 的文件系统访问能力。

### 存储结构

```
数据库名：starpact-db

对象存储 (Object Stores)：
├── configs           # 应用配置
├── chat-models       # 聊天模型配置
├── conversations     # 对话记录
├── gallery           # 图片库
├── videos            # 视频库
├── video-playlists   # 播放列表
├── prompt-templates  # 提示词模板
├── web-shortcuts     # 网页快捷方式
├── backgrounds       # 背景壁纸
├── logs              # 日志记录
├── ollama-models     # Ollama 模型信息
├── ffmpeg-configs    # FFmpeg 配置
└── text-contrasts    # 文本对比记录
```

### 存储位置

**便携式 (Portable)：**
- 数据存储在应用程序目录下的 `user-data` 文件夹

**安装式 (NSIS)：**
- Windows：`C:\Users\{用户名}\AppData\Local\星约\User Data\Default\IndexedDB`
- macOS：`~/Library/Application Support/星约/Default/IndexedDB`
- Linux：`~/.config/星约/Default/IndexedDB`

### 存储特性

- ✅ 异步非阻塞操作
- ✅ 支持大容量存储
- ✅ 数据持久化
- ✅ 自动迁移升级
- ✅ 存储使用监控

---

## 🛠️ 开发指南

### 添加新页面

1. 在 `src/pages/` 下创建新页面目录
2. 创建页面组件和样式文件
3. 在 `src/layouts/Sidebar.tsx` 中添加导航链接
4. 在 `src/App.tsx` 中添加页面路由

### 添加新主题

1. 在 `src/styles/themes/` 下创建新的主题文件
2. 定义 CSS 变量（参考现有主题）
3. 在 `src/styles/index.css` 中导入新主题
4. 在 `src/constants/themes.ts` 中添加主题配置

### 使用组件

```tsx
// CodeEditor 组件
import { CodeEditor } from '@/components/CodeEditor';

<CodeEditor
  value={content}
  onChange={handleChange}
  language="ini"
  fontSize={13}
  showLineNumbers={true}
  highlightActiveLine={true}
/>

// ImageViewer 组件
import { ImageViewer } from '@/components/ImageViewer';

<ImageViewer
  images={imageList}
  initialIndex={0}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
/>

// VideoPlayer 组件
import { VideoPlayer } from '@/components/VideoPlayer';

<VideoPlayer
  videoUrl={videoUrl}
  onEnded={() => console.log('播放结束')}
/>
```

### 状态管理

使用 Zustand 进行状态管理：

- 模型配置列表和激活状态
- 对话历史和当前对话
- 日志记录和日志面板状态
- Ollama 服务状态和模型列表
- 应用主题和布局设置

---

## ❓ 常见问题

<details>
<summary><b>Q: Ollama 服务无法启动？</b></summary>

确保：
1. 已正确安装 Ollama
2. Ollama 可在命令行中使用
3. 端口 11434 未被占用
</details>

<details>
<summary><b>Q: 模型拉取失败？</b></summary>

检查：
1. 网络连接是否正常
2. 模型名称是否正确
3. 磁盘空间是否充足
</details>

<details>
<summary><b>Q: Electron 应用无法启动？</b></summary>

确保：
1. 已执行 `npm install`
2. Node.js 版本符合要求
3. 端口 5173 未被占用
</details>

<details>
<summary><b>Q: Web 开发模式下无法使用 Ollama 功能？</b></summary>

这是正常现象。Ollama 功能需要 Electron 环境，请使用 `npm run electron:dev` 启动完整应用。
</details>

<details>
<summary><b>Q: 如何关闭欢迎页面？</b></summary>

在侧边栏找到欢迎页面开关按钮，点击即可关闭。设置会自动保存到 IndexedDB。
</details>

<details>
<summary><b>Q: 图片查看器如何使用？</b></summary>

点击聊天中的图片即可打开全屏查看器。支持滚轮缩放、鼠标拖拽、左右切换图片。
</details>

---

## 📋 更新日志

### v1.2.0
- ✨ 新增对话记录右键菜单功能
- ✨ 新增删除确认对话框
- 🎨 优化 ConfirmDialog 组件动画效果

### v1.1.0
- ✨ 新增 Ollama 思考模式控制功能
- ✨ 新增聊天中显示 think 内容功能
- ✨ 完善 Ollama 多模态模型支持
- 🎨 重新设计图片查看器为全屏效果
- ✨ 新增 MediaTools 页面，集成 FFmpeg
- ✨ 新增开发者模式控制功能
- ⚡ 优化 IndexedDB 存储性能

### v1.0.0
- 🎉 初始版本发布
- ✨ 支持 AI 模型管理和聊天功能
- ✨ 集成 Ollama 本地 AI 支持
- ✨ 高级代码编辑器
- ✨ 图片管理系统
- ✨ 视频播放器
- ✨ 内容比较工具
- ✨ 13 种主题支持

### 未来计划
- [ ] 多语言支持
- [ ] 插件系统
- [ ] 云同步功能
- [ ] macOS/Linux 版本
- [ ] 高级数据分析工具

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

<div align="center">

**星约 Starpact**

*如同星辰之间的约定，连接用户与智能、创意与效率*

感谢您选择星约，让我们一起探索星辰大海 ✨

**Copyright © 2025 Starpact Team**

</div>
