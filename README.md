# React + Electron + Node.js 多功能智能应用

一个基于 React、Electron 和 Node.js 的多功能桌面应用程序，集成了 AI 模型管理、对话功能、高级代码编辑、视频播放、图片管理等多种实用功能，提供丰富的主题选择和良好的用户体验。

## 技术栈

### 前端核心
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
- **Electron Store 11.0.2** - 本地存储

### 功能依赖
- **React Markdown 10.1.0** - Markdown 渲染
- **React Syntax Highlighter 16.1.0** - 代码高亮
- **clsx 2.1.1** - 类名工具
- **tailwind-merge 3.4.0** - Tailwind 类名合并
- **uuid 13.0.0** - 唯一 ID 生成
- **sharp 0.34.5** - 图像处理

## 项目结构

```
React_UI_Web/
├── .trae/                  # 开发工具配置
│   └── documents/          # 项目文档
├── backend/                # 后端服务
│   ├── main.py             # 后端入口
│   └── requirements.txt    # 后端依赖
├── dist/                   # 构建输出
├── src/                    # 源代码
│   ├── components/         # 可复用组件
│   │   ├── CodeEditor.tsx  # 高级代码编辑器组件
│   │   ├── GalleryComponents.tsx # 图片管理组件
│   │   ├── LogsPanel.tsx   # 日志面板组件
│   │   ├── NovelEditor.tsx # 小说编辑器组件
│   │   ├── OllamaModal.tsx # Ollama 管理弹窗组件
│   │   ├── Toast.tsx       # 提示组件
│   │   └── VideoPlayer.tsx # 视频播放器组件
│   ├── constants/          # 常量定义
│   │   ├── config.ts       # 配置常量
│   │   └── themes.ts       # 主题常量
│   ├── docs/               # 文档
│   │   └── development-guide.md # 开发指南
│   ├── hooks/              # 自定义 hooks
│   │   ├── index.ts        # hooks 导出
│   │   ├── useDebounce.ts  # 防抖 hook
│   │   └── useTheme.ts     # 主题 hook
│   ├── layouts/            # 布局组件
│   │   ├── styles/         # 布局样式
│   │   │   └── index.module.css # 布局样式文件
│   │   └── Sidebar.tsx     # 侧边栏布局
│   ├── main/               # Electron 主进程
│   │   ├── ipc/            # IPC 通信
│   │   │   ├── channels.ts # IPC 通道定义
│   │   │   └── ollamaHandlers.ts # Ollama IPC 处理器
│   │   ├── preload/        # 预加载脚本
│   │   │   ├── index.cjs   # 预加载入口 (CommonJS)
│   │   │   └── index.ts    # 预加载入口 (TypeScript)
│   │   ├── services/       # 后端服务
│   │   │   └── ollama/     # Ollama 服务
│   │   │       ├── OllamaAPIClient.ts       # API 客户端
│   │   │       └── OllamaServiceManager.ts  # 服务管理
│   │   └── index.ts        # 主进程入口
│   ├── pages/              # 页面组件
│   │   ├── Chat/           # 聊天页面
│   │   │   ├── styles/     # 聊天页面样式
│   │   │   │   └── index.module.css # 聊天页面样式文件
│   │   │   └── index.tsx   # 聊天页面组件
│   │   ├── Compare/        # 对比页面
│   │   │   ├── styles/     # 对比页面样式
│   │   │   │   └── index.module.css # 对比页面样式文件
│   │   │   └── index.tsx   # 对比页面组件
│   │   ├── Gallery/        # 图片管理页面
│   │   │   └── index.tsx   # 图片管理页面组件
│   │   ├── IniConfig/      # INI 配置页面
│   │   │   ├── styles/     # INI 配置页面样式
│   │   │   │   └── index.module.css # INI 配置页面样式文件
│   │   │   └── index.tsx   # INI 配置页面组件
│   │   ├── Logs/           # 日志页面
│   │   │   ├── styles/     # 日志页面样式
│   │   │   │   └── index.module.css # 日志页面样式文件
│   │   │   └── index.tsx   # 日志页面组件
│   │   ├── Models/         # 模型管理页面
│   │   │   ├── styles/     # 模型管理页面样式
│   │   │   │   └── index.module.css # 模型管理页面样式文件
│   │   │   ├── OllamaManager.tsx # Ollama 管理组件
│   │   │   └── index.tsx   # 模型配置页面组件
│   │   ├── PromptTemplates/ # 提示模板页面
│   │   │   └── index.tsx   # 提示模板页面组件
│   │   ├── Settings/       # 设置页面
│   │   │   ├── styles/     # 设置页面样式
│   │   │   │   └── index.module.css # 设置页面样式文件
│   │   │   ├── about.tsx   # 关于页面
│   │   │   └── index.tsx   # 设置页面组件
│   │   └── VideoPlayer/    # 视频播放器页面
│   │       ├── styles/     # 视频播放器页面样式
│   │       │   └── index.module.css # 视频播放器页面样式文件
│   │       └── index.tsx   # 视频播放器页面组件
│   ├── services/           # 前端服务
│   │   └── storage/        # 存储服务
│   │       ├── ConfigStorage.ts        # 配置存储
│   │       ├── GalleryStorage.ts       # 图库存储
│   │       ├── StorageManager.ts       # 存储管理
│   │       ├── VideoPlaylistStorage.ts # 视频播放列表存储
│   │       └── VideoStorage.ts         # 视频存储
│   ├── shared/             # 共享代码
│   │   └── types/          # 类型定义
│   │       └── ollama.ts   # Ollama 类型
│   ├── store/              # 状态管理
│   │   └── index.ts        # Zustand store
│   ├── styles/             # 样式文件
│   │   ├── themes/         # 主题样式
│   │   │   ├── amber-gold.css # 琥珀金主题
│   │   │   ├── caramel-brown.css # 焦糖棕主题
│   │   │   ├── coral-orange.css # 珊瑚橙主题
│   │   │   ├── dark.css    # 暗色主题
│   │   │   ├── deep-sea-blue.css # 深海蓝主题
│   │   │   ├── eye-care.css # 护眼主题
│   │   │   ├── forest-green.css # 森林绿主题
│   │   │   ├── lavender-purple.css # 薰衣草紫主题
│   │   │   ├── light.css   # 亮色主题
│   │   │   ├── midnight-blue.css # 午夜蓝主题
│   │   │   ├── mint-cyan.css # 薄荷青主题
│   │   │   ├── sakura-pink.css # 樱花粉主题
│   │   │   └── tech-blue.css # 科技蓝主题
│   │   └── index.css       # 全局样式
│   ├── types/              # 类型定义
│   │   ├── gallery.ts      # 图片管理类型
│   │   ├── index.ts        # 类型导出
│   │   └── video.ts        # 视频管理类型
│   ├── utils/              # 工具函数
│   │   ├── cn.ts           # 类名工具
│   │   └── diffEngine.ts   # 差异比较引擎
│   ├── App.tsx             # 应用根组件
│   ├── index.css           # 全局样式
│   └── main.tsx            # 应用入口
├── starpact-local/         # 本地数据
│   └── gallery/            # 图库数据
│       └── default.json    # 默认图库配置
├── .gitignore              # Git 忽略文件
├── README.md               # 项目文档
├── index.html              # HTML 入口
├── main.cjs                # Electron 主入口
├── package-lock.json       # npm 锁定文件
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript 配置
└── vite.config.ts          # Vite 配置
```

## 功能特性

### 1. AI 模型管理
- **多模型支持**：远程模型（OpenAI、Claude、通义千问、DeepSeek）和本地模型
- **参数自定义**：Temperature、Top P、Max Tokens 等参数可调节
- **模型分组**：按提供商和类型分组管理
- **收藏功能**：快速访问常用模型
- **使用统计**：跟踪模型调用次数、成功率和响应时间
- **模型连通性测试**：验证模型配置是否正确

### 2. Ollama 本地 AI 集成
- **服务检测**：自动检测本地 Ollama 服务状态
- **实时监控**：查看服务运行状态和资源使用
- **模型管理**：
  - 查看已安装的本地模型
  - 拉取新模型（支持进度显示）
  - 删除不需要的模型
- **配置管理**：自定义 Ollama 主机地址和端口
- **聊天功能**：与本地 AI 模型进行对话（支持流式输出）
- **操作日志**：记录所有 Ollama 相关操作

### 3. 智能聊天系统
- **多模型切换**：在对话中快速切换不同 AI 模型
- **Markdown 渲染**：支持富文本格式，包括代码块、列表等
- **代码高亮**：自动识别和高亮多种编程语言
- **对话历史**：保存和管理历史对话记录
- **对话标题**：自动生成对话标题，便于识别
- **收藏对话**：标记重要对话以便快速访问

### 4. 高级代码编辑器
- **语法高亮**：支持 INI 文件和普通文本的语法高亮
- **行号显示**：清晰的行号标识，便于定位
- **撤销/重做**：支持 Ctrl+Z（撤回）和 Ctrl+Y（重做）
- **智能缩进**：自动处理 Tab 缩进和取消缩进
- **行操作**：支持 Ctrl+D 复制当前行
- **光标定位**：实时显示当前光标位置（行、列）
- **高亮行**：可指定高亮显示特定行

### 5. 图片管理系统
- **图片浏览**：支持本地图片预览和管理
- **图片查看器**：支持缩放、旋转、拖拽等操作
- **缩略图导航**：独立的缩略图区域，支持滚轮切换
- **图片编辑**：基础的图片编辑功能
- **文件操作**：支持图片重命名、删除等操作
- **主题适配**：自动适配应用主题色彩
- **响应式设计**：适配不同屏幕尺寸

### 6. 视频播放器
- **视频播放**：支持本地视频文件播放
- **播放控制**：播放/暂停、音量调节、进度条
- **全屏模式**：支持全屏播放
- **播放列表**：管理和切换多个视频
- **视频信息**：显示视频分辨率、时长等信息

### 7. 内容比较工具
- **文本对比**：比较两个文本内容的差异
- **高亮显示**：清晰标记添加、删除和修改的内容
- **实时对比**：编辑时实时更新对比结果

### 8. 日志系统
- **多级日志**：info、warn、error、debug 等级别
- **模块化日志**：按功能模块分类记录
- **日志面板**：可折叠的实时日志查看面板
- **日志清空**：一键清空日志记录

### 9. 提示模板管理
- **模板库**：预设常用提示模板
- **模板编辑**：创建和修改自定义模板
- **快速应用**：在聊天中快速插入模板

### 10. 主题系统
- **13 种主题**：亮色、暗色、科技蓝、护眼、午夜蓝、森林绿、珊瑚橙、薰衣草紫、薄荷青、焦糖棕、樱花粉、深海蓝、琥珀金
- **CSS 变量**：统一的主题变量管理
- **实时切换**：无需重启即可切换主题
- **组件适配**：所有组件自动适配当前主题

### 11. 存储管理
- **配置存储**：保存应用配置和用户偏好
- **路径配置**：自定义各模块的存储路径
- **数据持久化**：确保数据在应用重启后保持

## 安装和运行

### 前置要求
- **Node.js 18+**：运行时环境
- **npm 或 yarn**：包管理工具
- **Ollama**（可选）：用于本地 AI 功能

### 安装依赖

```bash
npm install
```

### 开发模式

#### Web 开发（仅前端功能）
```bash
npm run dev
```

#### Electron 开发（完整功能）
```bash
npm run electron:dev
```

### 构建

```bash
npm run build
```

### 打包桌面应用

#### 构建所有类型（默认）

```bash
npm run electron:build
```

#### 构建NSIS安装包

```bash
npm run electron:build:nsis
```

#### 构建便携式应用

```bash
npm run electron:build:portable
```

#### 打包输出

- **输出目录**：`dist-electron/`
- **NSIS安装包**：`dist-electron/React Vite App Setup {版本号}.exe`
- **便携式应用**：`dist-electron/React Vite App-Portable-{版本号}.exe`

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
- `gemma2` - Google 的 Gemma 2 模型

### Ollama API

项目通过以下方式与 Ollama 交互：

1. **服务管理**：使用 `OllamaServiceManager` 类管理 Ollama 进程
2. **API 调用**：使用 `OllamaAPIClient` 类调用 Ollama REST API
3. **IPC 通信**：通过 Electron IPC 在主进程和渲染进程间通信

## 开发指南

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

### 使用 VideoPlayer 组件

```tsx
import { VideoPlayer } from '@/components/VideoPlayer';

<VideoPlayer
  videoUrl={videoUrl}
  onEnded={() => console.log('视频播放结束')}
  onError={(error) => console.error('视频播放错误:', error)}
/>
```

### 扩展 Ollama 功能

Ollama 集成采用模块化设计，易于扩展：

1. **服务层**：在 `src/main/services/ollama/` 中添加新功能
2. **IPC 层**：在 `src/main/ipc/` 中添加新的 IPC 通道
3. **UI 层**：在 `src/components/OllamaModal.tsx` 中添加 UI 组件

### 状态管理

使用 Zustand 进行状态管理，主要状态包括：
- 模型配置列表和激活状态
- 对话历史和当前对话
- 日志记录和日志面板状态
- Ollama 服务状态和模型列表
- 应用主题和布局设置
- 存储路径配置

### 存储管理

项目使用分层存储架构：
1. **配置存储**：保存应用设置和用户偏好
2. **对话存储**：保存聊天历史记录
3. **图库存储**：管理图片相关数据
4. **视频存储**：管理视频播放列表
5. **提示词模板存储**：管理预设和自定义提示词模板

## 存储系统详解

### 存储机制

项目主要使用 **IndexedDB** 作为核心存储机制，结合 Electron 的文件系统访问能力，实现数据的持久化存储。

#### 核心存储服务

| 存储服务 | 职责 | 文件位置 |
|---------|------|----------|
| `GalleryStorage` | 管理图片文件和相册 | `src/services/storage/GalleryStorage.ts` |
| `VideoPlaylistStorage` | 管理视频文件和播放列表 | `src/services/storage/VideoPlaylistStorage.ts` |
| `PromptTemplateStorage` | 管理提示词模板 | `src/services/storage/PromptTemplateStorage.ts` |
| `ConfigStorage` | 管理应用配置 | `src/services/storage/ConfigStorage.ts` |
| `StorageManager` | 统一存储管理接口 | `src/services/storage/StorageManager.ts` |

### 存储位置

#### Electron 开发模式

在开发模式下，IndexedDB 数据存储位置：

- **Windows**：`C:\Users\{用户名}\AppData\Local\{应用名}\User Data\Default\IndexedDB`
- **macOS**：`~/Library/Application Support/{应用名}/Default/IndexedDB`
- **Linux**：`~/.config/{应用名}/Default/IndexedDB`

#### 打包应用

##### 便携式（Portable）

- 数据存储在应用程序目录下的 `user-data` 文件夹中
- 优点：可以随应用一起移动，无需安装
- 缺点：存储在移动设备上可能影响性能

##### 安装式（NSIS）

- **Windows**：`C:\Users\{用户名}\AppData\Local\{应用名}\User Data\Default\IndexedDB`
- **macOS**：`~/Library/Application Support/{应用名}/Default/IndexedDB`
- **Linux**：`~/.config/{应用名}/Default/IndexedDB`

### 存储方式比较

#### 图片管理页面

- **存储内容**：图片文件、相册信息、缩略图
- **存储方式**：IndexedDB 存储文件数据，生成临时 Blob URL 用于显示
- **持久化**：完全持久化，重启应用后数据不丢失
- **特殊处理**：自动生成和管理 Blob URL，确保图片资源正确加载

#### 视频播放页面

- **存储内容**：视频文件、播放列表信息
- **存储方式**：IndexedDB 存储文件数据，生成临时 Blob URL 用于播放
- **持久化**：完全持久化，重启应用后数据不丢失
- **特殊处理**：自动生成和管理 Blob URL，确保视频资源正确加载

#### 提示词模板页面

- **存储内容**：提示词模板（文本数据）
- **存储方式**：IndexedDB 存储文本数据
- **持久化**：完全持久化，重启应用后数据不丢失
- **特殊处理**：无需 Blob URL 管理，直接存储和读取文本数据

### 存储工作流

#### 图片存储工作流

1. 用户选择图片文件
2. `GalleryStorage.saveImageFile()` 处理文件
3. 文件数据存储到 IndexedDB
4. 生成唯一 ID 和 Blob URL
5. 图片信息添加到相册
6. UI 使用 Blob URL 显示图片
7. 切换页面或重启应用时，自动重新生成 Blob URL

#### 视频存储工作流

1. 用户选择视频文件
2. `VideoPlaylistStorage.processVideoFile()` 处理文件
3. 文件数据存储到 IndexedDB
4. 生成唯一 ID 和 Blob URL
5. 视频信息添加到播放列表
6. 播放器使用 Blob URL 播放视频
7. 切换页面或重启应用时，自动重新生成 Blob URL

#### 提示词模板存储工作流

1. 用户创建或编辑提示词模板
2. `PromptTemplateStorage.saveTemplate()` 保存模板
3. 模板数据存储到 IndexedDB
4. 模板列表实时更新
5. 重启应用后，模板数据保持不变

### 存储优化

1. **Blob URL 管理**：自动生成和释放 Blob URL，避免内存泄漏
2. **数据压缩**：对大型媒体文件进行适当压缩
3. **索引优化**：为常用查询字段创建索引，提高查询速度
4. **批量操作**：使用事务进行批量存储操作，提高性能
5. **错误处理**：完善的错误处理机制，确保存储操作可靠

### 存储安全

1. **本地存储**：所有数据存储在本地，不上传到任何服务器
2. **权限控制**：遵循 Electron 的安全模型，限制文件系统访问
3. **数据隔离**：不同类型的数据存储在不同的对象存储空间中
4. **备份建议**：建议定期备份 `user-data` 文件夹，防止数据丢失

### 存储相关 API

#### GalleryStorage

- `saveImageFile(file: File, albumId: string): Promise<ImageFile>` - 保存图片文件
- `getAllAlbums(): Promise<Album[]>` - 获取所有相册
- `getImagesByAlbumId(albumId: string): Promise<ImageFile[]>` - 获取指定相册的图片

#### VideoPlaylistStorage

- `processVideoFile(file: File): Promise<VideoFile>` - 处理并保存视频文件
- `getAllPlaylists(): Promise<VideoPlaylist[]>` - 获取所有播放列表
- `getVideosByPlaylistId(playlistId: string): Promise<VideoFile[]>` - 获取指定播放列表的视频

#### PromptTemplateStorage

- `saveTemplate(template: PromptTemplate): Promise<void>` - 保存提示词模板
- `getAllTemplates(): Promise<PromptTemplate[]>` - 获取所有提示词模板
- `deleteTemplate(id: string): Promise<void>` - 删除提示词模板

### 常见存储问题

#### Q: 图片/视频在切换页面后无法加载？

A: 这是因为 Blob URL 具有临时性，页面切换或刷新后会失效。项目已实现自动重新生成 Blob URL 的机制，确保资源正确加载。

#### Q: 存储容量有限制吗？

A: IndexedDB 存储容量由浏览器/Electron 限制，通常为磁盘空间的一定比例（如 50%）。对于大型媒体文件，建议定期清理不需要的文件。

#### Q: 如何备份存储的数据？

A: 找到对应平台的存储位置，复制 `IndexedDB` 文件夹到安全位置即可。

#### Q: 存储路径可以自定义吗？

A: 目前存储路径由 Electron 自动管理，未来版本计划支持自定义存储路径功能。

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

### 存储架构

```
┌─────────────────────────────────────┐
│         渲染进程 (Renderer)         │
│  - 存储服务接口                      │
└──────────────┬──────────────────────┘
               │ IPC 通信
┌──────────────▼──────────────────────┐
│       主进程 (Main)                 │
│  - Electron Store                   │
│  - 文件系统操作                      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         本地存储                     │
│  - 配置文件                          │
│  - 对话历史                          │
│  - 图库数据                          │
│  - 视频播放列表                      │
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

### Q: 视频播放器无法播放视频？
A: 检查：
1. 视频文件格式是否支持
2. 文件路径是否正确
3. 视频文件是否损坏

### Q: 存储路径配置失败？
A: 确保：
1. 路径存在且可访问
2. 应用有足够的权限
3. 路径格式正确

## 性能优化

1. **组件懒加载**：使用 React.lazy 和 Suspense 延迟加载大型组件
2. **状态管理优化**：使用 Zustand 的切片功能，避免不必要的重渲染
3. **图片优化**：使用 sharp 处理图片，减少内存使用
4. **缓存策略**：缓存模型配置和常用数据
5. **批量更新**：使用 React 的自动批处理功能

## 安全注意事项

1. **API 密钥管理**：API 密钥存储在本地，不会上传到任何服务器
2. **IPC 安全**：使用上下文隔离和预加载脚本，确保 IPC 通信安全
3. **文件系统访问**：仅在用户授权的情况下访问文件系统
4. **网络请求**：仅向可信的 API 端点发送请求

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0
- 初始版本发布
- 支持 AI 模型管理和聊天功能
- 集成 Ollama 本地 AI 支持
- 高级代码编辑器
- 图片管理系统
- 视频播放器
- 内容比较工具
- 日志系统
- 提示模板管理
- 13 种主题支持
- 存储管理系统

### 未来计划
- [ ] 多语言支持
- [ ] 插件系统
- [ ] 云同步功能
- [ ] 更多 AI 模型集成
- [ ] 高级数据分析工具
- [ ] 批量图像处理功能
- [ ] 视频编辑功能

## 联系我们

如有任何问题或建议，请通过以下方式联系我们：

- Issue 追踪：[GitHub Issues](https://github.com/yourusername/react-electron-ai-app/issues)
- 邮箱：contact@example.com

---

**感谢使用 React + Electron + Node.js 多功能智能应用！**
