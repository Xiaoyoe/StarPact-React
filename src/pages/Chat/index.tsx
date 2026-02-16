import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Paperclip, Settings2, Square, Copy, Check, RotateCcw,
  Star, ChevronDown, Sparkles, Bot, User
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStore, generateId } from '@/store';
import type { ChatMessage } from '@/store';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

// Simulated AI responses
const aiResponses = [
  `这是一个很好的问题！让我为你详细解答：

## 关键要点

1. **模块化设计** - 将复杂问题分解为可管理的模块
2. **渐进式开发** - 从核心功能开始，逐步扩展
3. **持续迭代** - 根据反馈不断优化

\`\`\`python
# 示例代码
def process_data(data: list) -> dict:
    """处理数据的核心函数"""
    result = {}
    for item in data:
        key = item.get('category', 'default')
        if key not in result:
            result[key] = []
        result[key].append(item)
    return result
\`\`\`

> 💡 **提示**：始终保持代码的可读性和可维护性。

| 方面 | 建议 | 优先级 |
|------|------|--------|
| 架构 | 分层设计 | ⭐⭐⭐ |
| 测试 | 单元测试 | ⭐⭐⭐ |
| 文档 | 内联注释 | ⭐⭐ |

希望这个回答对你有帮助！如果有更多问题，请随时提问。`,

  `好的，我来分析一下这个问题：

### 方案对比

**方案一：传统方法**
- 优点：稳定可靠，社区支持好
- 缺点：性能有瓶颈

**方案二：新方法**
- 优点：性能优异，扩展性强
- 缺点：学习曲线较陡

\`\`\`typescript
// TypeScript 实现示例
interface Config {
  apiUrl: string;
  timeout: number;
  retryCount: number;
}

class ApiClient {
  private config: Config;
  
  constructor(config: Config) {
    this.config = config;
  }
  
  async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(\`\${this.config.apiUrl}\${endpoint}\`);
    return response.json();
  }
}
\`\`\`

综合来看，我推荐 **方案二**，因为它能更好地满足长期需求。`,

  `# 完整指南

## 第一步：环境搭建
确保你已安装以下工具：
- Node.js >= 18
- Python >= 3.10
- Git

## 第二步：项目初始化

\`\`\`bash
# 创建项目
npx create-vite@latest my-project --template react-ts
cd my-project

# 安装依赖
npm install
npm install tailwindcss @tailwindcss/vite
\`\`\`

## 第三步：核心配置

\`\`\`json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true
  }
}
\`\`\`

## 第四步：部署上线
1. 构建生产版本
2. 配置服务器
3. 设置 CI/CD

---

🎉 恭喜！按照以上步骤，你就能成功搭建项目了。`,
];

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-2 overflow-hidden rounded-lg" style={{ backgroundColor: 'var(--code-bg)' }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
        <span className="text-xs text-gray-400">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200"
        >
          {copied ? <><Check size={12} /> 已复制</> : <><Copy size={12} /> 复制</>}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '16px',
          fontSize: '13px',
          lineHeight: '1.5',
          background: 'transparent',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

function MessageBubble({ message, isLast }: { message: ChatMessage; isLast: boolean }) {
  const isUser = message.role === 'user';
  const [showActions, setShowActions] = useState(false);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("group flex gap-3 px-4 py-3", isUser ? "flex-row-reverse" : "flex-row")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: isUser ? 'var(--primary-color)' : 'var(--bg-tertiary)',
        }}
      >
        {isUser ? (
          <User size={16} color="white" />
        ) : (
          <Bot size={16} style={{ color: 'var(--primary-color)' }} />
        )}
      </div>

      {/* Content */}
      <div className={cn("max-w-[75%] min-w-0", isUser ? "items-end" : "items-start")}>
        {/* Name & Time */}
        <div className={cn("mb-1 flex items-center gap-2 text-xs", isUser ? "flex-row-reverse" : "flex-row")}
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span className="font-medium">{isUser ? '你' : (message.modelName || 'AI')}</span>
          <span>{formatTime(message.timestamp)}</span>
        </div>

        {/* Bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-3 copy-allowed",
            isUser ? "rounded-tr-md" : "rounded-tl-md"
          )}
          style={{
            backgroundColor: isUser ? 'var(--bg-chat-user)' : 'var(--bg-chat-ai)',
            color: 'var(--text-primary)',
            userSelect: 'text',
          }}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed copy-allowed" style={{ userSelect: 'text' }}>{message.content}</p>
          ) : (
            <div className={cn("markdown-body copy-allowed", message.isStreaming && isLast && 'typing-cursor')} style={{ userSelect: 'text' }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    if (match) {
                      return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
                    }
                    return <code className={className} {...props}>{children}</code>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Actions */}
        <AnimatePresence>
          {showActions && !message.isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={cn("mt-1 flex items-center gap-1", isUser ? "justify-end" : "justify-start")}
            >
              {[
                { icon: Copy, label: '复制', action: () => navigator.clipboard.writeText(message.content) },
                { icon: RotateCcw, label: '重新生成', action: () => {} },
                { icon: Star, label: '收藏', action: () => {} },
              ].map(({ icon: Icon, label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  title={label}
                >
                  <Icon size={12} />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function ChatPage() {
  const {
    conversations, activeConversationId,
    models, activeModelId, setActiveModel,
    addMessage, updateMessage, addConversation,
    addLog,
  } = useStore();

  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const activeModel = models.find(m => m.id === activeModelId);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, scrollToBottom]);

  const simulateStreaming = async (conversationId: string, messageId: string, fullText: string) => {
    setIsStreaming(true);
    let currentText = '';
    const words = fullText.split('');

    // 优化流式输出速度，减少延迟
    for (let i = 0; i < words.length; i++) {
      currentText += words[i];
      // 每5个字符更新一次，提高响应速度
      if (i % 5 === 0 || i === words.length - 1) {
        updateMessage(conversationId, messageId, {
          content: currentText,
          isStreaming: true,
        });
        // 减少延迟时间，加快响应速度
        const delay = words[i] === '\n' ? 10 : (words[i] === ' ' ? 5 : 2);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    updateMessage(conversationId, messageId, { isStreaming: false });
    setIsStreaming(false);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;

    let convId = activeConversationId;

    // Create new conversation if none active
    if (!convId) {
      const newConv = {
        id: generateId(),
        title: inputValue.slice(0, 30) + (inputValue.length > 30 ? '...' : ''),
        messages: [],
        modelId: activeModelId || models[0]?.id || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false,
      };
      addConversation(newConv);
      convId = newConv.id;
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
    };
    addMessage(convId, userMsg);
    setInputValue('');

    addLog({
      id: generateId(),
      level: 'info',
      message: `发送消息到 ${activeModel?.name || '未知模型'}`,
      timestamp: Date.now(),
      module: 'Chat',
    });

    // Simulate AI response
    const aiMsgId = generateId();
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      modelName: activeModel?.name || 'AI',
      isStreaming: true,
    };
    addMessage(convId, aiMsg);

    const responseText = aiResponses[Math.floor(Math.random() * aiResponses.length)];
    await simulateStreaming(convId, aiMsgId, responseText);

    addLog({
      id: generateId(),
      level: 'info',
      message: `收到 ${activeModel?.name || 'AI'} 响应 (${responseText.length} 字符)`,
      timestamp: Date.now(),
      module: 'Chat',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col no-select">
      {/* Header */}
      <header
        className="flex items-center justify-between border-b px-6 no-select"
        style={{
          height: 56,
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {activeConversation?.title || '新对话'}
          </h1>
          {activeConversation && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {activeConversation.messages.length} 条消息
            </span>
          )}
        </div>

        {/* Model Selector */}
        <div className="relative">
          <button
            onClick={() => setShowModelSelect(!showModelSelect)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Sparkles size={14} style={{ color: 'var(--primary-color)' }} />
            <span>{activeModel?.name || '选择模型'}</span>
            <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
          </button>

          <AnimatePresence>
            {showModelSelect && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <div className="p-1.5">
                  {models.filter(m => m.isActive).map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setActiveModel(model.id);
                        setShowModelSelect(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                      style={{
                        backgroundColor: model.id === activeModelId ? 'var(--primary-light)' : 'transparent',
                      }}
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                        style={{
                          backgroundColor: 'var(--primary-light)',
                          color: 'var(--primary-color)',
                        }}
                      >
                        {model.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {model.name}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {model.provider} · {model.type === 'remote' ? '远程' : '本地'}
                        </div>
                      </div>
                      {model.id === activeModelId && (
                        <Check size={16} className="ml-auto" style={{ color: 'var(--primary-color)' }} />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto no-select"
        style={{ backgroundColor: 'var(--bg-primary)' }}
        onClick={() => setShowModelSelect(false)}
      >
        {!activeConversation || activeConversation.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'var(--primary-light)' }}
              >
                <Sparkles size={36} style={{ color: 'var(--primary-color)' }} />
              </div>
              <h2 className="mb-2 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                开始新的对话
              </h2>
              <p className="mb-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                当前模型：{activeModel?.name || '未选择'} · 输入问题开始交流
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['解释量子计算的原理', '用Python实现排序算法', '设计一个REST API', '推荐学习资源'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInputValue(s)}
                    className="rounded-full px-4 py-2 text-sm transition-all hover:opacity-80 active:scale-95"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl py-4">
            {activeConversation.messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isLast={idx === activeConversation.messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div
        className="border-t p-4 no-select"
        style={{
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <div className="mx-auto max-w-4xl">
          <div
            className="flex items-end gap-2 rounded-2xl p-3"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              title="上传附件"
            >
              <Paperclip size={18} />
            </button>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Shift+Enter 换行)"
              rows={1}
              className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm outline-none copy-allowed"
              style={{
                color: 'var(--text-primary)',
                lineHeight: '1.5',
                userSelect: 'text',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              title="参数设置"
            >
              <Settings2 size={18} />
            </button>
            <button
              onClick={isStreaming ? () => setIsStreaming(false) : handleSend}
              disabled={!inputValue.trim() && !isStreaming}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95"
              style={{
                backgroundColor: (inputValue.trim() || isStreaming) ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                color: (inputValue.trim() || isStreaming) ? 'white' : 'var(--text-tertiary)',
                cursor: (!inputValue.trim() && !isStreaming) ? 'not-allowed' : 'pointer',
              }}
            >
              {isStreaming ? <Square size={16} /> : <Send size={16} />}
            </button>
          </div>
          <div className="mt-2 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
            AI 生成的内容可能存在不准确之处，请注意甄别
          </div>
        </div>
      </div>
    </div>
  );
}
