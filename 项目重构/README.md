# Starpact Vue - Tauri + Vue3 + TypeScript + Rust

这是星约应用的重构版本，使用 Tauri + Vue3 + TypeScript + Rust 技术栈。

## 技术栈

- **前端**: Vue 3 + TypeScript + Pinia + Vue Router
- **桌面框架**: Tauri 2.0
- **后端**: Rust
- **样式**: Tailwind CSS
- **构建工具**: Vite

## 项目结构

```
项目重构/
├── src/                      # Vue 前端代码
│   ├── components/           # 组件
│   │   ├── layout/          # 布局组件
│   │   └── ui/              # UI 组件
│   ├── views/               # 页面视图
│   ├── stores/              # Pinia 状态管理
│   ├── services/            # 服务层
│   │   └── tauri/           # Tauri API 封装
│   ├── composables/         # 组合式函数
│   ├── types/               # TypeScript 类型
│   ├── styles/              # 样式文件
│   └── router/              # 路由配置
│
├── src-tauri/               # Rust 后端代码
│   ├── src/
│   │   ├── commands/        # Tauri 命令
│   │   ├── models/          # 数据模型
│   │   └── services/        # 服务层
│   └── Cargo.toml
│
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 开发指南

### 环境要求

- Node.js 18+
- Rust 1.70+
- pnpm/npm/yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri:dev
```

### 构建生产版本

```bash
npm run tauri:build
```

## 功能模块

### 已实现

- [x] 基础项目架构
- [x] Vue Router 路由配置
- [x] Pinia 状态管理
- [x] Tauri 命令封装
- [x] FFmpeg 命令 (Rust)
- [x] Ollama API (Rust)
- [x] 文件操作 (Rust)
- [x] 存储服务 (Rust)
- [x] 基础 UI 组件

### 待实现

- [ ] 完整的聊天功能
- [ ] 模型管理表单
- [ ] 媒体工具完整功能
- [ ] 图库管理
- [ ] 视频播放器
- [ ] 主题样式迁移
- [ ] IndexedDB 存储

## 迁移说明

本项目是从 React + Electron 重构到 Vue3 + Tauri 的版本。

### 主要变化

1. **React → Vue3**: 组件使用 Composition API 重写
2. **Electron → Tauri**: 主进程代码使用 Rust 重写
3. **Zustand → Pinia**: 状态管理迁移
4. **IPC → Tauri Commands**: 通信机制变更

### 迁移进度

| 模块 | 进度 |
|------|------|
| 基础架构 | ✅ 100% |
| 类型定义 | ✅ 100% |
| 状态管理 | ✅ 100% |
| 路由配置 | ✅ 100% |
| Tauri 命令 | ✅ 80% |
| UI 组件 | 🔄 30% |
| 页面视图 | 🔄 40% |
| 样式主题 | 🔄 20% |

## 许可证

MIT
