# React + Electron + Node.js 多功能项目

一个基于 React、Electron 和 Node.js 的多功能桌面应用程序，支持本地 AI 模型管理、对话功能和高级代码编辑功能。

## 技术栈

### 前端
- **React 19.2.3** - 用户界面框架
- **TypeScript 5.9.3** - 类型安全
- **Vite 7.2.4** - 构建工具
- **Tailwind CSS 4.1.17** - 样式框架
- **Framer Motion 12.33.0** - 动画库
- **Zustand 5.0.11** - 状态管理
- **Lucide React 0.563.0** - 图标库

### 桌面应用
- **Electron 28.0.0** - 桌面应用框架
- **Electron Builder 24.0.0** - 应用打包工具

### 其他依赖
- **React Markdown 10.1.0** - Markdown 渲染
- **React Syntax Highlighter 16.1.0** - 代码高亮
- **clsx 2.1.1** - 类名工具
- **tailwind-merge 3.4.0** - Tailwind 类名合并
- **CodeEditor** - 高级代码编辑器组件（支持语法高亮、撤回功能等）

## 项目结构

```
React_UI_Web/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── CodeEditor.tsx   # 高级代码编辑器组件
│   │   ├── NovelEditor.tsx  # 小说编辑器组件
│   │   ├── OllamaModal.tsx # Ollama 管理弹窗组件
│   │   └── LogsPanel.tsx   # 日志面板组件
│   ├── layouts/             # 布局组件
│   │   └── Sidebar.tsx      # 侧边栏布局
│   ├── pages/               # 页面组件
│   │   ├── Chat/            # 聊天页面
│   │   ├── Compare/         # 对比页面
│   │   ├── Logs/            # 日志页面
│   │   ├── Models/          # 模型管理页面
│   │   │   └── index.tsx    # 模型配置页面
│   │   └── Settings/        # 设置页面
│   ├── main/                # Electron 主进程
│   │   ├── index.ts         # 主进程入口
│   │   ├── ipc/             # IPC 通信
│   │   │   ├── channels.ts  # IPC 通道定义
│   │   │   ├── handlers.ts  # IPC 处理器
│   │   │   └── ollamaHandlers.ts  # Ollama IPC 处理器
│   │   ├── preload/         # 预加载脚本
│   │   │   └── index.ts     # 预加载入口
│   │   └── services/       # 后端服务
│   │       └── ollama/      # Ollama 服务
│   │           ├── OllamaServiceManager.ts  # 服务管理
│   │           └── OllamaAPIClient.ts       # API 客户端
│   ├── shared/              # 共享代码
│   │   └── types/           # 类型定义
│   │       └── ollama.ts    # Ollama 类型
│   ├── store/               # 状态管理
│   │   └── index.ts         # Zustand store
│   └── styles/              # 样式文件
│       ├── themes/          # 主题样式
│       │   ├── light.css    # 亮色主题
│       │   ├── dark.css     # 暗色主题
│       │   ├── tech-blue.css # 科技蓝主题
│       │   └── eye-care.css # 护眼主题
│       └── index.css        # 全局样式
├── dist/                    # 构建输出
├── package.json
└── vite.config.ts
```

## 功能特性

### 1. 模型管理
- 支持远程模型配置（OpenAI、Claude 等）
- 支持本地模型配置
- 模型参数自定义（Temperature、Top P、Max Tokens）
- 模型分组和收藏功能
- 模型连通性测试
- 模型使用统计

### 2. Ollama 集成
- **服务检测**：自动检测本地 Ollama 服务是否运行
- **状态监控**：实时查看服务运行状态
- **模型管理**：
  - 查看已安装的本地模型
  - 拉取新模型（支持进度显示）
  - 删除不需要的模型
- **配置管理**：自定义 Ollama 主机地址和端口
- **聊天功能**：与本地 AI 模型进行对话（支持流式输出）
- **操作日志**：记录所有 Ollama 相关操作

### 3. 聊天功能
- 多模型支持
- Markdown 渲染
- 代码高亮
- 对话历史记录

### 4. 日志系统
- 操作日志记录
- 日志级别分类（info、warn、error）
- 模块化日志管理

### 5. 主题系统
- 多主题支持（亮色、暗色、科技蓝、护眼、午夜蓝、森林绿、珊瑚橙、薰衣草紫、薄荷青、焦糖棕、樱花粉、深海蓝、琥珀金）
- CSS 变量管理
- 组件级样式隔离

### 6. 高级代码编辑器
- **语法高亮**：支持 INI 文件和普通文本的语法高亮
- **行号显示**：清晰的行号标识
- **撤回功能**：支持 Ctrl+Z（撤回）和 Ctrl+Y（重做）
- **Tab 缩进**：智能缩进和取消缩进
- **行操作**：支持 Ctrl+D 复制当前行
- **自动完成**：智能自动完成功能
- **选中功能**：优化的文本选中效果
- **实时光标位置**：显示当前光标位置（行、列）

## 安装和运行

### 前置要求
- Node.js 18+ 
- npm 或 yarn
- Ollama（用于本地 AI 功能）

### 安装依赖

```bash
npm install
```

### 开发模式

#### Web 开发
```bash
npm run dev
```

#### Electron 开发
```bash
npm run electron:dev
```

### 构建

```bash
npm run build
```

### 打包桌面应用

```bash
npm run electron:build
```

## Ollama 集成说明

### 安装 Ollama

1. 访问 [Ollama 官网](https://ollama.com/download) 下载并安装
2. 确保安装后可以在命令行中使用 `ollama` 命令

### 使用 Ollama 功能

1. 在终端中启动 Ollama 服务：
   ```bash
   ollama serve
   ```

2. 启动应用后，点击侧边栏底部的 **"Ollama 管理"** 按钮

3. 在弹窗中点击右上角的 **刷新按钮** 检查服务状态

4. 拉取模型：
   - 在"拉取新模型"输入框中输入模型名称（如 `llama3.2`）
   - 点击"拉取模型"按钮
   - 等待下载完成

5. 管理模型：
   - 查看已安装的本地模型
   - 删除不需要的模型
   - 查看模型详细信息

### 常用模型

- `llama3.2` - Meta 的 Llama 3.2 模型
- `qwen2.5` - 阿里通义千问
- `mistral` - Mistral AI 模型
- `codellama` - 代码专用模型

### Ollama API

项目通过以下方式与 Ollama 交互：

1. **服务管理**：使用 `OllamaServiceManager` 类管理 Ollama 进程
2. **API 调用**：使用 `OllamaAPIClient` 类调用 Ollama REST API
3. **IPC 通信**：通过 Electron IPC 在主进程和渲染进程间通信

## 开发指南

### 添加新页面

1. 在 `src/pages/` 下创建新页面目录
2. 创建页面组件
3. 在侧边栏中添加导航链接

### 添加新主题

1. 在 `src/styles/themes/` 下创建新的主题文件
2. 定义 CSS 变量
3. 在 `src/styles/index.css` 中导入新主题

### 使用 CodeEditor 组件

```tsx
import { CodeEditor } from '@/components/CodeEditor';

// 基本用法
<CodeEditor
  value={iniContent}
  onChange={handleIniChange}
  language="ini"
  fontSize={13}
  showLineNumbers={true}
  highlightActiveLine={true}
  tabSize={2}
  wordWrap={false}
  onCursorChange={(line, col) => {
    console.log(`光标位置: 行 ${line}, 列 ${col}`);
  }}
/>

// 高级用法（带高亮行）
<CodeEditor
  value={modelContent}
  onChange={handleModelChange}
  language="ini"
  highlightLine={5} // 高亮第5行
  showLineNumbers={true}
  readOnly={false}
/>
```

### 扩展 Ollama 功能

Ollama 集成采用模块化设计，易于扩展：

1. **服务层**：在 `src/main/services/ollama/` 中添加新功能
2. **IPC 层**：在 `src/main/ipc/` 中添加新的 IPC 通道
3. **UI 层**：在 `src/components/OllamaModal.tsx` 中添加 UI 组件

### 状态管理

使用 Zustand 进行状态管理，主要状态包括：
- 模型配置列表
- 当前激活的模型
- 日志记录
- Ollama 服务状态
- Ollama 弹窗状态

## 架构设计

### Electron 架构

```
┌─────────────────────────────────────┐
│         渲染进程 (Renderer)         │
│  React UI + Zustand Store           │
└──────────────┬──────────────────────┘
               │ IPC 通信
┌──────────────▼──────────────────────┐
│       预加载脚本 (Preload)          │
│  暴露安全的 API 给渲染进程           │
└──────────────┬──────────────────────┘
               │ IPC 通信
┌──────────────▼──────────────────────┐
│         主进程 (Main)                │
│  - 窗口管理                          │
│  - IPC 处理器                        │
│  - 服务管理                          │
│  - Node.js 后端服务                  │
└─────────────────────────────────────┘
```

### Ollama 集成架构

```
┌─────────────────────────────────────┐
│      OllamaModal (UI)             │
│  - 服务状态检测                      │
│  - 模型管理                          │
│  - 聊天界面                          │
└──────────────┬──────────────────────┘
               │ IPC 调用
┌──────────────▼──────────────────────┐
│      Ollama IPC Handlers            │
│  - 处理渲染进程请求                  │
│  - 调用服务层                        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    OllamaServiceManager             │
│  - 检测 Ollama 服务状态               │
│  - 状态监控                          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      OllamaAPIClient                │
│  - HTTP API 调用                    │
│  - 模型列表                          │
│  - 聊天接口                          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Ollama 服务                 │
│  - 本地 AI 模型运行                  │
└─────────────────────────────────────┘
```

## 常见问题

### Q: Ollama 服务无法启动？
A: 确保：
1. 已正确安装 Ollama
2. Ollama 可在命令行中使用
3. 端口 11434 未被占用

### Q: 模型拉取失败？
A: 检查：
1. 网络连接是否正常
2. 模型名称是否正确
3. 磁盘空间是否充足

### Q: Electron 应用无法启动？
A: 确保：
1. 已执行 `npm install`
2. Node.js 版本符合要求
3. 端口 5173 未被占用

### Q: 在 Web 开发模式下无法使用 Ollama 功能？
A: 这是正常现象。Ollama 功能需要 Electron 环境，请使用 `npm run electron:dev` 启动完整应用。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
