# 星约 (Starpact) - 多功能智能桌面应用

<div align="center">

![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)
![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)
![Rust](https://img.shields.io/badge/Rust-2021-DEA584?logo=rust)
![License](https://img.shields.io/badge/License-MIT-green)

**一个基于 Tauri + Vue3 + TypeScript + Rust 构建的现代化桌面应用**

[功能特性](#功能特性) • [快速开始](#快速开始) • [技术架构](#技术架构) • [开发指南](#开发指南)

</div>

---

## 📖 项目简介

星约（Starpact）是一个从 React + Electron 重构到 Vue3 + Tauri 的多功能智能桌面应用。它集成了 AI 聊天、媒体处理、图库管理等多种实用工具，采用现代化的技术栈打造高性能、低资源占用的桌面应用体验。

### 为什么选择 Tauri？

- **更小的体积**：相比 Electron，打包体积减少约 90%
- **更低的内存占用**：使用系统 WebView，内存占用降低 50%+
- **更高的安全性**：Rust 后端提供内存安全保障
- **更好的性能**：原生应用级别的性能表现

---

## ✨ 功能特性

### 🤖 AI 聊天助手
- 支持多种 AI 模型接入（OpenAI、Claude、Ollama 等）
- 流式响应与思维链展示
- 会话管理与历史记录
- 模型预设与参数配置
- 多模型对比功能

### 🎨 模型管理
- 远程模型与本地模型配置
- 模型分组与收藏
- 使用统计与性能监控
- 预设模板管理

### 🎬 媒体工具
- **格式转换**：视频/音频格式互转
- **视频编辑**：剪辑、合并、压缩
- **音频处理**：提取、转换、降噪
- **批量处理**：文件夹批量操作
- **命令构建器**：可视化 FFmpeg 命令生成
- **视频分析**：媒体信息查看

### 🖼️ 图库管理
- **图片浏览**
  - 多视图模式：网格、瀑布流、列表视图
  - 虚拟滚动：流畅浏览大量图片
  - 懒加载：按需加载，节省内存
  - 图片查看器：双击放大、拖动查看细节
- **图片管理**
  - 相册管理：创建、编辑、删除相册
  - 批量操作：选择、移动、删除
  - 收藏功能：标记喜爱的图片
  - 标签系统：图片分类管理
- **导入功能**
  - 拖拽上传：支持拖拽文件或文件夹
  - 批量导入：支持上万张图片批量导入
  - 进度显示：实时显示导入进度和速度
  - 取消支持：可随时取消导入操作
- **数据处理**
  - JSON查看：查看图片数据JSON
  - 分页加载：按需加载数据，避免卡顿
  - 本地存储：SQLite数据库 + 文件系统
  - 数据导出：支持数据备份和导出

### 🎥 视频播放器
- 本地视频播放
- 播放控制与进度管理
- 支持多种视频格式

### ⚙️ 系统设置
- 多主题切换（13 种主题）
- 应用配置管理
- 数据备份与恢复

### 📝 其他工具
- **INI 配置编辑器**：配置文件管理
- **提示词模板**：Prompt 模板库
- **文本对比**：文本差异对比工具
- **壁纸管理**：壁纸设置与管理

---

## 🚀 快速开始

### 环境要求

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | ≥ 18.0 | JavaScript 运行时 |
| Rust | ≥ 1.70 | Rust 编译器 |
| pnpm/npm/yarn | 最新版 | 包管理器 |

#### 安装 Rust

**Windows:**
```bash
# 下载并运行 rustup-init.exe
# 或使用 winget
winget install Rustlang.Rustup
```

**macOS/Linux:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd 项目重构

# 安装前端依赖
npm install
```

### 开发模式

```bash
# 启动开发服务器（热重载）
npm run tauri:dev
```

首次启动会编译 Rust 后端，可能需要几分钟时间。

### 构建生产版本

```bash
# 构建应用
npm run tauri:build
```

构建产物位于 `src-tauri/target/release/bundle/` 目录下。

---

## 🏗️ 技术架构

### 技术栈总览

```
┌─────────────────────────────────────────────────────┐
│                    前端层 (Frontend)                 │
│  Vue 3 + TypeScript + Pinia + Vue Router            │
│  Tailwind CSS + Lucide Icons                        │
└────────────────────┬────────────────────────────────┘
                     │ Tauri IPC
┌────────────────────┴────────────────────────────────┐
│                   应用层 (Tauri)                     │
│  Tauri 2.0 Runtime + Plugins                        │
│  - Shell Plugin (进程管理)                           │
│  - Dialog Plugin (对话框)                            │
│  - Store Plugin (持久化存储)                         │
└────────────────────┬────────────────────────────────┘
                     │ FFI
┌────────────────────┴────────────────────────────────┐
│                   后端层 (Backend)                   │
│  Rust + Tokio (异步运行时)                           │
│  - SQLite (rusqlite)                                │
│  - HTTP Client (reqwest)                            │
│  - FFmpeg Integration                               │
└─────────────────────────────────────────────────────┘
```

### 核心依赖

#### 前端依赖
| 包名 | 版本 | 用途 |
|------|------|------|
| vue | ^3.5.13 | 渐进式 JavaScript 框架 |
| pinia | ^2.2.6 | Vue 状态管理 |
| vue-router | ^4.4.5 | Vue 路由管理 |
| @vueuse/motion | ^3.0.3 | Vue 动画库 |
| @formkit/auto-animate | ^0.9.0 | 自动动画 |
| lucide-vue-next | ^0.454.0 | 图标库 |
| idb | ^8.0.3 | IndexedDB 封装 |
| tailwindcss | ^3.4.19 | CSS 框架 |

#### Rust 依赖
| 包名 | 版本 | 用途 |
|------|------|------|
| tauri | 2 | 应用框架 |
| tokio | 1 | 异步运行时 |
| serde | 1 | 序列化框架 |
| rusqlite | 0.32 | SQLite 数据库 |
| reqwest | 0.12 | HTTP 客户端 |
| chrono | 0.4 | 时间处理 |
| uuid | 1 | UUID 生成 |
| walkdir | 2 | 目录遍历 |

---

## 📁 项目结构

```
项目重构/
├── 📂 src/                          # Vue 前端代码
│   ├── 📂 components/               # 组件目录
│   │   ├── 📂 common/              # 通用组件
│   │   │   └── Modal.vue           # 模态框组件
│   │   ├── 📂 layout/              # 布局组件
│   │   │   ├── Sidebar.vue         # 侧边栏
│   │   │   └── TitleBar.vue        # 标题栏
│   │   ├── 📂 ui/                  # UI 组件
│   │   │   ├── Button.vue          # 按钮组件
│   │   │   ├── Input.vue           # 输入框组件
│   │   │   └── Toast.vue           # 提示组件
│   │   ├── 📂 ffmpeg/              # FFmpeg 相关组件
│   │   │   ├── Badge.vue           # 徽章组件
│   │   │   ├── ProgressBar.vue     # 进度条
│   │   │   └── Terminal.vue        # 终端输出
│   │   ├── 📂 media/               # 媒体工具组件
│   │   │   ├── AdvancedTools.vue   # 高级工具
│   │   │   ├── AudioProcess.vue    # 音频处理
│   │   │   ├── CommandBuilder.vue  # 命令构建器
│   │   │   ├── FolderProcess.vue   # 文件夹处理
│   │   │   ├── FormatConvert.vue   # 格式转换
│   │   │   ├── IcoConvert.vue      # ICO 转换
│   │   │   ├── ImageFormatConvert.vue # 图片格式转换
│   │   │   ├── VideoAnalysis.vue   # 视频分析
│   │   │   └── VideoEdit.vue       # 视频编辑
│   │   ├── SplashScreen.vue        # 启动屏幕
│   │   ├── SplashScreenFade.vue    # 淡入启动屏
│   │   └── SplashScreenMinimal.vue # 极简启动屏
│   │
│   ├── 📂 views/                   # 页面视图
│   │   ├── ChatView.vue            # AI 聊天页面
│   │   ├── ModelsView.vue          # 模型管理页面
│   │   ├── MediaToolsView.vue      # 媒体工具页面
│   │   ├── GalleryView.vue         # 图库页面
│   │   ├── VideoPlayerView.vue     # 视频播放页面
│   │   ├── SettingsView.vue        # 设置页面
│   │   ├── IniConfigView.vue       # INI 配置页面
│   │   ├── PromptTemplatesView.vue # 提示词模板页面
│   │   └── CompareView.vue         # 文本对比页面
│   │
│   ├── 📂 stores/                  # Pinia 状态管理
│   │   ├── useAppStore.ts          # 应用状态
│   │   ├── useModelStore.ts        # 模型管理状态
│   │   ├── useChatStore.ts         # 聊天状态
│   │   ├── useConversationStore.ts # 会话管理状态
│   │   ├── useThemeStore.ts        # 主题状态
│   │   ├── useFFmpegStore.ts       # FFmpeg 状态
│   │   └── useWallpaperStore.ts    # 壁纸状态
│   │
│   ├── 📂 services/                # 服务层
│   │   └── 📂 tauri/               # Tauri API 封装
│   │       ├── ffmpeg.ts           # FFmpeg 服务
│   │       ├── file.ts             # 文件服务
│   │       ├── ollama.ts           # Ollama 服务
│   │       ├── storage.ts          # 存储服务
│   │       └── window.ts           # 窗口服务
│   │
│   ├── 📂 composables/             # 组合式函数
│   │   ├── useDebounce.ts          # 防抖函数
│   │   ├── useToast.ts             # Toast 提示
│   │   └── useWallpaperStyle.ts    # 壁纸样式
│   │
│   ├── 📂 types/                   # TypeScript 类型定义
│   │   ├── index.ts                # 主类型定义
│   │   ├── ffmpeg.ts               # FFmpeg 类型
│   │   └── ollama.ts               # Ollama 类型
│   │
│   ├── 📂 router/                  # 路由配置
│   │   └── index.ts                # 路由定义
│   │
│   ├── 📂 styles/                  # 样式文件
│   │   └── main.css                # 主样式
│   │
│   ├── 📂 config/                  # 配置文件
│   │   └── animation.ts            # 动画配置
│   │
│   ├── App.vue                     # 根组件
│   └── main.ts                     # 应用入口
│
├── 📂 src-tauri/                   # Rust 后端代码
│   ├── 📂 src/
│   │   ├── 📂 commands/            # Tauri 命令
│   │   │   ├── mod.rs              # 命令模块导出
│   │   │   ├── ffmpeg.rs           # FFmpeg 命令
│   │   │   ├── ollama.rs           # Ollama API 命令
│   │   │   ├── file.rs             # 文件操作命令
│   │   │   ├── storage.rs          # 存储命令
│   │   │   ├── gallery.rs          # 图库命令
│   │   │   └── wallpaper.rs        # 壁纸命令
│   │   │
│   │   ├── 📂 services/            # 服务层
│   │   │   ├── mod.rs              # 服务模块导出
│   │   │   ├── ffmpeg.rs           # FFmpeg 服务
│   │   │   └── 📂 storage/         # 存储服务
│   │   │       ├── mod.rs          # 存储模块导出
│   │   │       ├── backup.rs       # 备份服务
│   │   │       ├── config.rs       # 配置服务
│   │   │       ├── database.rs     # 数据库服务
│   │   │       └── paths.rs        # 路径管理
│   │   │
│   │   ├── 📂 models/              # 数据模型
│   │   │   └── mod.rs              # 模型定义
│   │   │
│   │   ├── lib.rs                  # 库入口
│   │   └── main.rs                 # 主入口
│   │
│   ├── 📂 capabilities/            # Tauri 权限配置
│   │   └── default.json            # 默认权限
│   │
│   ├── 📂 icons/                   # 应用图标
│   │   ├── 128x128.png
│   │   ├── 32x32.png
│   │   └── icon.ico
│   │
│   ├── Cargo.toml                  # Rust 依赖配置
│   ├── tauri.conf.json             # Tauri 配置
│   └── build.rs                    # 构建脚本
│
├── 📂 data/                        # 应用数据目录
│   ├── 📂 backups/                 # 备份数据
│   ├── 📂 cache/                   # 缓存数据
│   ├── 📂 exports/                 # 导出数据
│   │   ├── 📂 ini/                 # INI 配置导出
│   │   └── 📂 prompts/             # 提示词导出
│   ├── 📂 ffmpeg/                  # FFmpeg 配置
│   ├── 📂 images/                  # 图片数据
│   │   └── 📂 thumbnails/          # 缩略图
│   ├── 📂 videos/                  # 视频数据
│   │   └── 📂 cache/               # 视频缓存
│   ├── 📂 wallpapers/              # 壁纸数据
│   └── config.json                 # 应用配置
│
├── 📂 docs/                        # 文档目录
│   └── ANIMATION_GUIDE.md          # 动画指南
│
├── package.json                    # NPM 配置
├── vite.config.ts                  # Vite 配置
├── tsconfig.json                   # TypeScript 配置
├── tailwind.config.js              # Tailwind 配置
└── postcss.config.js               # PostCSS 配置
```

---

## 🎨 主题系统

应用内置 13 种精心设计的主题：

| 主题名称 | 代码 | 适用场景 |
|---------|------|---------|
| 浅色模式 | `light` | 日间使用 |
| 深色模式 | `dark` | 夜间使用 |
| 科技蓝 | `tech-blue` | 编程开发 |
| 护眼模式 | `eye-care` | 长时间使用 |
| 午夜蓝 | `midnight-blue` | 深夜工作 |
| 森林绿 | `forest-green` | 放松阅读 |
| 珊瑚橙 | `coral-orange` | 创意工作 |
| 薰衣草紫 | `lavender-purple` | 舒适环境 |
| 薄荷青 | `mint-cyan` | 清新风格 |
| 焦糖棕 | `caramel-brown` | 温暖氛围 |
| 樱花粉 | `sakura-pink` | 柔和风格 |
| 深海蓝 | `deep-sea-blue` | 专业工作 |
| 琥珀金 | `amber-gold` | 高端质感 |

---

## 🔧 开发指南

### 开发脚本

```bash
# 启动前端开发服务器
npm run dev

# 启动 Tauri 开发模式（推荐）
npm run tauri:dev

# 构建前端
npm run build

# 预览构建结果
npm run preview

# 构建 Tauri 应用
npm run tauri:build
```

### 代码规范

#### Vue 组件规范
- 使用 `<script setup lang="ts">` 语法
- 组件命名采用 PascalCase
- Props 定义使用 TypeScript 接口
- 使用 Composition API

#### Rust 代码规范
- 遵循 Rust 官方代码风格
- 使用 `rustfmt` 格式化代码
- 命令函数使用 `#[tauri::command]` 宏
- 异步操作使用 Tokio 运行时

### 添加新功能

#### 1. 添加新的页面
```typescript
// src/router/index.ts
{
  path: '/new-feature',
  name: 'NewFeature',
  component: () => import('@/views/NewFeatureView.vue'),
  meta: { title: '新功能' },
}
```

#### 2. 添加新的 Tauri 命令
```rust
// src-tauri/src/commands/new_feature.rs
#[tauri::command]
pub async fn new_command() -> Result<String, String> {
    Ok("Success".to_string())
}

// src-tauri/src/commands/mod.rs
pub mod new_feature;

// src-tauri/src/lib.rs
.invoke_handler(tauri::generate_handler![
    commands::new_feature::new_command,
])
```

#### 3. 添加新的状态管理
```typescript
// src/stores/useNewFeatureStore.ts
import { defineStore } from 'pinia';

export const useNewFeatureStore = defineStore('newFeature', {
  state: () => ({
    // 状态定义
  }),
  actions: {
    // 方法定义
  },
});
```

---

## 📊 功能模块进度

| 模块 | 功能 | 进度 | 说明 |
|------|------|------|------|
| 基础架构 | 项目结构、配置 | ✅ 100% | 已完成 |
| 类型定义 | TypeScript 类型 | ✅ 100% | 已完成 |
| 状态管理 | Pinia Store | ✅ 100% | 已完成 |
| 路由配置 | Vue Router | ✅ 100% | 已完成 |
| Tauri 命令 | Rust 后端命令 | ✅ 80% | 核心功能已完成 |
| UI 组件 | 基础组件库 | 🔄 30% | 持续优化中 |
| 页面视图 | 功能页面 | 🔄 40% | 核心页面已完成 |
| 样式主题 | 主题系统 | 🔄 20% | 基础主题已完成 |
| AI 聊天 | 完整聊天功能 | 🔄 60% | 基础功能已完成 |
| 模型管理 | 模型配置表单 | 🔄 50% | 基础管理已完成 |
| 媒体工具 | FFmpeg 集成 | ✅ 70% | 核心功能已完成 |
| 图库管理 | 图片管理 | ✅ 90% | 核心功能已完成 |
| 视频播放 | 播放器功能 | 🔄 30% | 基础播放已完成 |
| IndexedDB | 本地存储 | 🔄 20% | 基础结构已完成 |

---

## 🔄 迁移说明

本项目是从 React + Electron 重构到 Vue3 + Tauri 的版本。

### 主要技术变更

| 原技术 | 新技术 | 说明 |
|--------|--------|------|
| React 18 | Vue 3.5 | 组件框架迁移 |
| Electron | Tauri 2.0 | 桌面框架迁移 |
| Zustand | Pinia | 状态管理迁移 |
| IPC 通信 | Tauri Commands | 进程通信迁移 |
| Node.js 主进程 | Rust 后端 | 后端语言迁移 |

### 迁移优势

1. **性能提升**
   - 应用体积减少约 90%
   - 内存占用降低 50%+
   - 启动速度提升 2-3 倍

2. **开发体验**
   - TypeScript 全栈类型安全
   - Rust 内存安全保障
   - 更好的开发工具支持

3. **用户体验**
   - 原生窗口体验
   - 更流畅的动画效果
   - 更低的系统资源占用

### 迁移要点

1. **组件迁移**
   - 使用 Composition API 替代 Hooks
   - 响应式系统从 useState 改为 ref/reactive
   - 生命周期从 useEffect 改为 onMounted/watch

2. **状态管理**
   - Zustand store 迁移到 Pinia store
   - Actions 和 Getters 的对应关系
   - 持久化存储方案调整

3. **后端迁移**
   - Node.js 主进程代码重写为 Rust
   - IPC 通信改为 Tauri Commands
   - 文件系统操作使用 Rust 标准库

---

## 📝 配置说明

### Tauri 配置

```json
{
  "productName": "星约",
  "version": "1.0.0",
  "identifier": "com.starpact.app",
  "app": {
    "windows": [{
      "title": "星约 - Starpact",
      "width": 1400,
      "height": 800,
      "minWidth": 900,
      "minHeight": 600,
      "decorations": false,
      "center": true
    }]
  }
}
```

### Vite 配置

```typescript
{
  server: {
    port: 1420,
    strictPort: true
  },
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: 'esbuild'
  }
}
```

---

## 🐛 常见问题

### 1. Rust 编译错误
**问题**: 首次运行时 Rust 编译失败
**解决**: 确保安装了完整的 Rust 工具链，运行 `rustup update` 更新

### 2. Tauri 开发服务器启动失败
**问题**: `npm run tauri:dev` 启动失败
**解决**: 检查 1420 端口是否被占用，或修改 `vite.config.ts` 中的端口配置

### 3. FFmpeg 功能不可用
**问题**: 媒体工具功能异常
**解决**: 确保系统已安装 FFmpeg 并添加到环境变量

### 4. 窗口无边框问题
**问题**: 窗口无法拖动
**解决**: 使用 TitleBar 组件提供的拖动区域

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- [Tauri](https://tauri.app/) - 现代化的桌面应用框架
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Rust](https://www.rust-lang.org/) - 系统编程语言
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [Lucide Icons](https://lucide.dev/) - 精美的图标库

---

<div align="center">

**Made with ❤️ by Starpact Team**

</div>
