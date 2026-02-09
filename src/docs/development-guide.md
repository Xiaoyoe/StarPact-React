# 项目开发指南

本指南将帮助你在现有项目基础上新增功能页或功能，同时保持与现有代码的一致性和风格统一。

## 项目结构概览

```
src/
├── components/        # 可复用组件
├── constants/         # 全局常量和配置
├── hooks/             # 自定义 hooks
├── layouts/           # 布局组件
├── main/              # 主进程代码
├── pages/             # 页面组件
├── shared/            # 共享类型和工具
├── store/             # 全局状态管理
├── styles/            # 全局样式
├── utils/             # 工具函数
├── App.tsx            # 应用根组件
└── index.css          # 全局样式文件
```

## 新增功能页的步骤

### 1. 创建页面目录结构

在 `src/pages/` 目录下创建新的页面目录，例如 `NewFeature`：

```
NewFeature/
├── styles/
│   └── index.module.css  # 页面特定样式
└── index.tsx             # 页面主组件
```

### 2. 实现页面组件

参考现有的页面实现（如 `Chat` 或 `Models` 页面），创建新页面组件。

#### 页面组件结构示例

```tsx
import { useState } from 'react';
import { useStore } from '@/store';
import { cn } from '@/utils/cn';

// 导入需要的图标
import { SomeIcon, AnotherIcon } from 'lucide-react';

export function NewFeaturePage() {
  const {
    // 从 store 中获取需要的状态和方法
    someState, setSomeState,
    anotherState,
  } = useStore();

  const [localState, setLocalState] = useState('');

  // 页面逻辑
  const handleSomeAction = () => {
    // 处理逻辑
  };

  return (
    <div className="flex h-full flex-col">
      {/* 页面头部 */}
      <header
        className="flex items-center justify-between border-b px-6"
        style={{
          height: 56,
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          新功能标题
        </h1>
        {/* 头部操作按钮 */}
      </header>

      {/* 页面内容 */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* 内容区域 */}
      </div>

      {/* 页面底部（如果需要） */}
    </div>
  );
}
```

### 3. 注册路由

在 `App.tsx` 文件中注册新页面的路由。

### 4. 添加侧边栏导航

在 `src/layouts/Sidebar.tsx` 文件中添加新页面的导航项。

## 新增功能的步骤

### 1. 定义类型（如果需要）

在 `src/shared/types/` 目录下定义新功能需要的类型。

### 2. 更新全局状态

在 `src/store/index.ts` 文件中添加新功能需要的状态和操作方法。

### 3. 创建组件（如果需要）

在 `src/components/` 目录下创建新功能需要的组件。

### 4. 实现功能逻辑

根据功能需求实现相应的逻辑。

## 代码风格指南

### 1. 样式使用

- **主题颜色**：使用 CSS 变量（如 `var(--primary-color)`）而不是硬编码颜色
- **布局**：使用 Flexbox 或 Grid 布局
- **间距**：保持一致的间距风格
- **响应式**：考虑不同屏幕尺寸的适配

### 2. 状态管理

- 使用 Zustand 进行全局状态管理
- 组件内部状态使用 `useState`
- 复杂逻辑使用自定义 hooks

### 3. 命名规范

- **组件**：使用 PascalCase（如 `NewFeaturePage`）
- **函数**：使用 camelCase（如 `handleSomeAction`）
- **变量**：使用 camelCase（如 `localState`）
- **常量**：使用 UPPER_SNAKE_CASE（如 `MAX_ITEMS`）

### 4. 代码组织

- 按功能模块组织代码
- 每个文件保持单一职责
- 使用适当的注释说明复杂逻辑

### 5. 性能优化

- 使用 `React.memo` 优化组件渲染
- 使用 `useCallback` 和 `useMemo` 优化函数和计算值
- 避免不必要的重渲染

## 全局变量和配置

### 可用的全局变量

#### 主题变量

- `--primary-color`：主色调
- `--bg-primary`：主背景色
- `--bg-secondary`：次要背景色
- `--text-primary`：主文本色
- `--text-secondary`：次要文本色
- `--text-tertiary`： tertiary 文本色
- `--border-color`：边框颜色
- `--hover-bg-secondary`：悬停背景色

#### 配置常量

- `APP_CONFIG`：应用配置
- `STORAGE_KEYS`：存储键名
- `API_CONFIG`：API 配置
- `UI_CONFIG`：UI 配置

### 如何使用全局变量

#### 1. 在 CSS 中使用

```css
.button {
  background-color: var(--primary-color);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
```

#### 2. 在 React 组件中使用

```tsx
<div
  style={{
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
  }}
>
  内容
</div>
```

#### 3. 在全局状态中使用

```tsx
import { useStore } from '@/store';

function MyComponent() {
  const { theme, setTheme } = useStore();
  
  return (
    <div>
      <p>当前主题：{theme}</p>
      <button onClick={() => setTheme('dark')}>
        切换到深色主题
      </button>
    </div>
  );
}
```

## UI 组件使用指南

### 1. 按钮样式

项目中定义了几种按钮样式：

- **主要按钮**：使用主色调
- **次要按钮**：`.btn-secondary` 类
- ** tertiary 按钮**：`.btn-tertiary` 类
- **危险按钮**：`.btn-danger` 类

### 2. 输入框样式

保持与现有输入框一致的样式：

```tsx
<input
  className="bg-transparent border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
  style={{
    borderColor: 'var(--border-color)',
    color: 'var(--text-primary)',
  }}
  placeholder="输入内容..."
/>
```

### 3. 卡片样式

```tsx
<div
  className="rounded-xl border p-4"
  style={{
    borderColor: 'var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
  }}
>
  卡片内容
</div>
```

### 4. 图标使用

使用 Lucide React 图标库：

```tsx
import { SomeIcon } from 'lucide-react';

// 使用图标
<SomeIcon size={20} style={{ color: 'var(--primary-color)' }} />
```

## 最佳实践

1. **参考现有代码**：在实现新功能时，参考现有代码的风格和模式
2. **保持一致性**：确保新代码与现有代码风格一致
3. **使用类型定义**：为所有数据结构添加类型定义
4. **添加适当的注释**：对于复杂逻辑，添加清晰的注释
5. **测试功能**：确保新功能正常工作且不影响现有功能

## 常见问题

### Q: 如何添加新的主题颜色？

A: 在 `src/styles/themes/` 目录下的对应主题文件中添加新的 CSS 变量。

### Q: 如何添加新的全局状态？

A: 在 `src/store/index.ts` 文件中添加新的状态和操作方法。

### Q: 如何处理异步操作？

A: 使用 `async/await` 语法，并在需要时添加加载状态。

### Q: 如何添加新的 API 调用？

A: 在 `src/main/services/` 目录下添加新的服务文件，或扩展现有的服务。

## 示例：新增一个简单的功能页

### 示例1：笔记管理页面

#### 步骤 1：创建页面目录

```
src/pages/Notes/
├── styles/
│   └── index.module.css
└── index.tsx
```

#### 步骤 2：实现页面组件

```tsx
import { useState } from 'react';
import { useStore, generateId } from '@/store';
import { cn } from '@/utils/cn';
import { Plus, Save, Trash2 } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export function NotesPage() {
  const { addLog } = useStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleAddNote = () => {
    const newNote: Note = {
      id: generateId(),
      title: '新笔记',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setCurrentNote(newNote);
    setTitle(newNote.title);
    setContent(newNote.content);
    
    addLog({
      id: generateId(),
      level: 'info',
      message: '创建新笔记',
      timestamp: Date.now(),
      module: 'Notes',
    });
  };

  const handleSaveNote = () => {
    if (!currentNote) return;
    
    const updatedNotes = notes.map(note => 
      note.id === currentNote.id
        ? {
            ...note,
            title,
            content,
            updatedAt: Date.now(),
          }
        : note
    );
    setNotes(updatedNotes);
    setCurrentNote({
      ...currentNote,
      title,
      content,
      updatedAt: Date.now(),
    });
    
    addLog({
      id: generateId(),
      level: 'info',
      message: `保存笔记: ${title}`,
      timestamp: Date.now(),
      module: 'Notes',
    });
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId));
    if (currentNote?.id === noteId) {
      setCurrentNote(null);
      setTitle('');
      setContent('');
    }
    
    addLog({
      id: generateId(),
      level: 'warn',
      message: '删除笔记',
      timestamp: Date.now(),
      module: 'Notes',
    });
  };

  const handleSelectNote = (note: Note) => {
    setCurrentNote(note);
    setTitle(note.title);
    setContent(note.content);
  };

  return (
    <div className="flex h-full flex-col">
      {/* 头部 */}
      <header
        className="flex items-center justify-between border-b px-6"
        style={{
          height: 56,
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          笔记管理
        </h1>
        <button
          onClick={handleAddNote}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
          style={{
            backgroundColor: 'var(--primary-color)',
            color: 'white',
          }}
        >
          <Plus size={16} />
          新建笔记
        </button>
      </header>

      {/* 内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 笔记列表 */}
        <div
          className="w-64 border-r overflow-y-auto"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          {notes.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              暂无笔记，点击新建按钮创建
            </div>
          ) : (
            <div className="p-2">
              {notes.map(note => (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={cn(
                    "mb-2 rounded-lg p-3 cursor-pointer transition-colors",
                    currentNote?.id === note.id ? "bg-primary-light/50" : "hover:bg-secondary"
                  )}
                  style={{
                    backgroundColor: currentNote?.id === note.id ? 'var(--primary-light)' : 'transparent',
                  }}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-medium mb-1 truncate" style={{ color: 'var(--text-primary)' }}>
                      {note.title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                      className="text-xs p-1 rounded transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {note.content.substring(0, 50)}{note.content.length > 50 ? '...' : ''}
                  </p>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    {new Date(note.updatedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 笔记编辑区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!currentNote ? (
            <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              选择一个笔记进行编辑
            </div>
          ) : (
            <>
              {/* 标题输入 */}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-b px-6 py-4 text-lg font-medium outline-none"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
                placeholder="笔记标题"
              />
              
              {/* 内容输入 */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 p-6 resize-none outline-none"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                }}
                placeholder="笔记内容..."
              />
              
              {/* 底部操作栏 */}
              <div
                className="border-t px-6 py-3 flex justify-end"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                }}
              >
                <button
                  onClick={handleSaveNote}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors"
                  style={{
                    backgroundColor: 'var(--primary-color)',
                    color: 'white',
                  }}
                >
                  <Save size={16} />
                  保存笔记
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### 步骤 3：注册路由

在 `App.tsx` 文件中添加新页面的路由：

```tsx
import { NotesPage } from '@/pages/Notes';

// 在路由配置中添加
<Route path="/notes" element={<NotesPage />} />
```

#### 步骤 4：添加侧边栏导航

在 `src/layouts/Sidebar.tsx` 文件中添加新页面的导航项：

```tsx
// 导入图标
import { FileText } from 'lucide-react';

// 在导航项中添加
{
  id: 'notes',
  label: '笔记',
  icon: FileText,
  path: '/notes',
}
```

### 示例2：INI配置管理页面

项目已包含一个完整的INI配置管理页面（`src/pages/IniConfig/index.tsx`），该页面展示了如何：

1. **使用项目风格的颜色变量**：所有样式都使用 `var(--primary-color)`、`var(--bg-primary)` 等CSS变量
2. **保持一致的布局结构**：左侧边栏 + 主内容区域的布局
3. **集成全局状态管理**：使用 `useStore` 获取 `addLog` 方法记录操作日志
4. **实现完整的CRUD操作**：创建、读取、更新、删除INI配置文件
5. **提供文件导入导出功能**：支持从本地导入INI文件和导出配置
6. **实现内容验证**：提供INI格式验证功能，检查语法错误
7. **使用动画效果**：集成 `framer-motion` 实现流畅的过渡动画

#### 主要功能特性

- **文件管理**：创建、删除、搜索INI配置文件
- **节管理**：添加、删除、展开/折叠配置节
- **键值对管理**：添加、删除、编辑配置键值对
- **实时预览**：可视化编辑和原始内容查看
- **格式验证**：自动检测INI文件格式错误
- **导入导出**：支持文件导入导出功能

#### 代码风格要点

```tsx
// 1. 使用项目颜色变量
style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}

// 2. 使用cn工具函数处理条件样式
className={cn("base-class", condition && "conditional-class")}

// 3. 使用framer-motion实现动画
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

// 4. 使用Lucide React图标
import { FileText, Plus, Save } from 'lucide-react';

// 5. 集成全局状态
const { addLog } = useStore();
addLog({ id: generateId(), level: 'info', message: '...', timestamp: Date.now(), module: 'IniConfig' });
```

## 总结

通过遵循本指南，你可以在现有项目基础上快速、一致地新增功能页或功能，同时保持代码的可维护性和风格统一性。记住，参考现有代码是最好的学习方式，保持代码风格一致是团队协作的关键。