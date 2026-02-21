import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Paperclip, Settings2, Square, Copy, Check, RotateCcw,
  Star, ChevronDown, Sparkles, Bot, User, HardDrive, Globe, Brain, ChevronRight, Pencil
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStore, generateId } from '@/store';
import type { ChatMessage } from '@/store';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatQuickNav } from '@/components/ChatQuickNav';
import { configStorage } from '@/services/storage/ConfigStorage';
import { useToast } from '@/components/Toast';
import { notificationService } from '@/utils/notification';

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

function MessageBubble({ message, isLast, compactMode }: { message: ChatMessage; isLast: boolean; compactMode: boolean }) {
  const isUser = message.role === 'user';
  const [showActions, setShowActions] = useState(true);
  const [showThinking, setShowThinking] = useState(true);

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
      data-message-id={message.id}
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
            backgroundColor: compactMode ? 'transparent' : (isUser ? 'var(--bg-chat-user)' : 'var(--bg-chat-ai)'),
            color: 'var(--text-primary)',
            userSelect: 'text',
            border: '1px solid var(--border-color)',
          }}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed copy-allowed" style={{ userSelect: 'text' }}>{message.content}</p>
          ) : (
            <>
              {/* Thinking Section */}
              {message.thinking && (
                <div className="mb-3">
                  <button
                    onClick={() => setShowThinking(!showThinking)}
                    className="flex items-center gap-1.5 text-xs font-medium mb-2 transition-colors"
                    style={{ color: 'var(--primary-color)' }}
                  >
                    <Brain size={12} />
                    <span>思考过程</span>
                    <ChevronRight 
                      size={12} 
                      style={{ 
                        transform: showThinking ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }} 
                    />
                  </button>
                  <AnimatePresence>
                    {showThinking && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div 
                          className="rounded-lg p-3 text-xs leading-relaxed"
                          style={{ 
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                          >
                            {message.thinking}
                          </ReactMarkdown>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              
              {/* Main Content */}
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
            </>
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
    addMessage, updateMessage, addConversation, updateConversation,
    addLog,
    chatWallpaper, setChatWallpaper,
    compactMode, setCompactMode,
    ollamaModels, activeOllamaModel, setActiveOllamaModel,
    ollamaStatus,
  } = useStore();

  const toast = useToast();

  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [showNav, setShowNav] = useState(true);
  const [switchingModel, setSwitchingModel] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const activeModel = models.find(m => m.id === activeModelId);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, scrollToBottom]);

  // 从配置加载壁纸设置
  useEffect(() => {
    const savedWallpaper = configStorage.get('chatWallpaper');
    if (savedWallpaper) {
      setChatWallpaper(savedWallpaper);
    }
    
    // 仅在启用桌面通知时请求权限
    const chatNotification = configStorage.get('chatNotification');
    if (chatNotification?.enabled) {
      notificationService.requestPermission();
    }
  }, []);

  const handleSwitchOllamaModel = async (newModelName: string) => {
    if (switchingModel) {
      toast.info('正在切换模型中，请稍候', { duration: 2000 });
      return;
    }

    if (newModelName === activeOllamaModel) {
      setShowModelSelect(false);
      return;
    }

    setSwitchingModel(true);
    setShowModelSelect(false);

    try {
      if (activeOllamaModel) {
        toast.info(`正在关闭 ${activeOllamaModel}...`, { duration: 2000 });
        await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: activeOllamaModel,
            keep_alive: 0
          })
        });
      }

      setActiveOllamaModel(newModelName);
      setActiveModel(null);
      toast.info(`正在启动 ${newModelName}...`, { duration: 2000 });

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: newModelName,
          prompt: '',
          keep_alive: '10m'
        })
      });

      if (response.ok) {
        setTimeout(() => {
          toast.success(`已切换到 ${newModelName}`, { duration: 2000 });
        }, 2000);
      } else {
        toast.error(`启动 ${newModelName} 失败`, { duration: 3000 });
      }
    } catch (error) {
      toast.error('模型切换失败', { duration: 3000 });
    } finally {
      setTimeout(() => {
        setSwitchingModel(false);
      }, 3000);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;

    let convId = activeConversationId;
    const currentModelName = activeOllamaModel || activeModel?.name || 'AI';
    const userInput = inputValue.trim();

    // Create new conversation if none active
    if (!convId) {
      const titleText = userInput.replace(/\n/g, ' ').trim();
      const newConv = {
        id: generateId(),
        title: titleText.slice(0, 20) + (titleText.length > 20 ? '...' : ''),
        messages: [],
        modelId: activeModelId || models[0]?.id || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false,
      };
      addConversation(newConv);
      convId = newConv.id;
    } else if (activeConversation && activeConversation.title === '新对话' && activeConversation.messages.length === 0) {
      // Update title for new conversation with first message
      const titleText = userInput.replace(/\n/g, ' ').trim();
      updateConversation(convId, { 
        title: titleText.slice(0, 20) + (titleText.length > 20 ? '...' : '') 
      });
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
    };
    addMessage(convId, userMsg);
    setInputValue('');
    
    // Reset input height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = '36px';
    }

    addLog({
      id: generateId(),
      level: 'info',
      message: `发送消息到 ${currentModelName}`,
      timestamp: Date.now(),
      module: 'Chat',
    });

    // Add AI message placeholder
    const aiMsgId = generateId();
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      modelName: currentModelName,
      isStreaming: true,
    };
    addMessage(convId, aiMsg);

    // If Ollama model is selected, call Ollama API
    if (activeOllamaModel && ollamaStatus?.isRunning) {
      try {
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: activeOllamaModel,
            prompt: userInput,
            stream: true,
          }),
        });

        if (response.ok) {
          setIsStreaming(true);
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let fullResponse = '';
          let thinkingContent = '';
          let isInThinking = false;

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n').filter(line => line.trim());

              for (const line of lines) {
                try {
                  const data = JSON.parse(line);
                  if (data.response) {
                    const token = data.response;
                    
                    // 检测 <think&gt; 标签
                    if (token.includes('<think&gt;')) {
                      isInThinking = true;
                    }
                    if (token.includes('</think&gt;')) {
                      isInThinking = false;
                    }

                    fullResponse += token;

                    // 解析思考内容和回答内容
                    let displayContent = fullResponse;
                    let currentThinking = '';

                    const thinkMatch = fullResponse.match(/<think&gt;([\s\S]*?)(<\/think&gt;|$)/);
                    if (thinkMatch) {
                      currentThinking = thinkMatch[1];
                      if (fullResponse.includes('</think&gt;')) {
                        displayContent = fullResponse.replace(/<think&gt;[\s\S]*?<\/think&gt;/, '').trim();
                      } else {
                        displayContent = '';
                      }
                    }

                    // 实时更新消息
                    updateMessage(convId, aiMsgId, {
                      content: displayContent,
                      thinking: currentThinking,
                      isStreaming: true,
                    });
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }

          // 最终处理：清理标签
          let finalResponse = fullResponse;
          let finalThinking = '';
          
          const thinkMatch = fullResponse.match(/<think&gt;([\s\S]*?)<\/think&gt;/);
          if (thinkMatch) {
            finalThinking = thinkMatch[1].trim();
            finalResponse = fullResponse.replace(/<think&gt;[\s\S]*?<\/think&gt;/, '').trim();
          }

          updateMessage(convId, aiMsgId, {
            content: finalResponse,
            thinking: finalThinking,
            isStreaming: false,
          });

          setIsStreaming(false);
          
          toast.success(`${activeOllamaModel} 回复完成`, { duration: 2000 });
          
          // 发送桌面通知（仅在启用时）
          const chatNotification = configStorage.get('chatNotification');
          if (chatNotification?.enabled) {
            const preview = finalResponse.slice(0, 100) + (finalResponse.length > 100 ? '...' : '');
            notificationService.showChatComplete(activeOllamaModel, preview);
          }
          
          addLog({
            id: generateId(),
            level: 'info',
            message: `收到 ${activeOllamaModel} 响应 (${finalResponse.length} 字符)${finalThinking ? `, 思考内容 ${finalThinking.length} 字符` : ''}`,
            timestamp: Date.now(),
            module: 'Chat',
          });
        } else {
          updateMessage(convId, aiMsgId, { 
            content: '抱歉，Ollama 响应失败，请检查服务状态。',
            isStreaming: false 
          });
          setIsStreaming(false);
          toast.error('Ollama 响应失败', { duration: 3000 });
          const chatNotification = configStorage.get('chatNotification');
          if (chatNotification?.enabled) {
            notificationService.showChatError(activeOllamaModel, `HTTP ${response.status}`);
          }
          addLog({
            id: generateId(),
            level: 'error',
            message: `Ollama 响应失败: HTTP ${response.status}`,
            timestamp: Date.now(),
            module: 'Chat',
          });
        }
      } catch (error) {
        updateMessage(convId, aiMsgId, { 
          content: '抱歉，无法连接到 Ollama 服务。',
          isStreaming: false 
        });
        setIsStreaming(false);
        toast.error('无法连接到 Ollama 服务', { duration: 3000 });
        const chatNotification = configStorage.get('chatNotification');
        if (chatNotification?.enabled) {
          notificationService.showChatError(activeOllamaModel, '无法连接到服务');
        }
        addLog({
          id: generateId(),
          level: 'error',
          message: `Ollama 连接失败: ${error}`,
          timestamp: Date.now(),
          module: 'Chat',
        });
      }
    } else {
      updateMessage(convId, aiMsgId, { 
        content: '请先配置模型 API 或启动 Ollama 本地模型后再进行对话。\n\n您可以在以下位置进行配置：\n- **模型管理** 页面添加远程模型 API\n- **Ollama 管理器** 启动本地模型',
        isStreaming: false 
      });
      setIsStreaming(false);
      
      addLog({
        id: generateId(),
        level: 'warn',
        message: '未配置可用的模型，请先配置 API 或启动 Ollama',
        timestamp: Date.now(),
        module: 'Chat',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartEditTitle = () => {
    if (activeConversation) {
      setEditingTitle(activeConversation.title);
      setIsEditingTitle(true);
      setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 0);
    }
  };

  const handleSaveTitle = () => {
    if (activeConversation && editingTitle.trim()) {
      updateConversation(activeConversation.id, { title: editingTitle.trim() });
      toast.success('标题已更新');
    }
    setIsEditingTitle(false);
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditingTitle('');
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditTitle();
    }
  };

  return (
    <div className="flex h-full flex-col no-select" style={{ backgroundColor: compactMode ? 'transparent' : 'var(--bg-primary)', backgroundImage: chatWallpaper ? `url(${chatWallpaper})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      {/* 快速导航组件 */}
    {showNav && activeConversation && activeConversation.messages.length > 0 && (
      <ChatQuickNav 
        messages={activeConversation.messages} 
        onHoverMessage={setHoveredMessage}
      />
    )}
      
      {/* Header */}
      <header
        className="flex items-center justify-between border-b px-6 no-select"
        style={{
          height: 56,
          borderColor: 'var(--border-color)',
          backgroundColor: compactMode ? 'transparent' : 'var(--bg-primary)',
        }}
      >
        <div className="flex items-center gap-3">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                ref={titleInputRef}
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleSaveTitle}
                className="text-base font-semibold px-2 py-1 rounded border focus:outline-none"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--primary-color)',
                  minWidth: '200px'
                }}
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 rounded hover:bg-opacity-80 transition-colors"
                style={{ color: 'var(--primary-color)' }}
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleCancelEditTitle}
                className="p-1 rounded hover:bg-opacity-80 transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Square size={14} />
              </button>
            </div>
          ) : (
            <>
              {activeConversation && (
                <button
                  onClick={handleStartEditTitle}
                  className="p-1.5 rounded-lg transition-colors hover:bg-opacity-80"
                  style={{ 
                    color: 'var(--text-tertiary)',
                    backgroundColor: 'transparent'
                  }}
                  title="编辑标题"
                >
                  <Pencil size={14} />
                </button>
              )}
              <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {activeConversation?.title || '新对话'}
              </h1>
            </>
          )}
          {activeConversation && !isEditingTitle && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {activeConversation.messages.length} 条消息
            </span>
          )}
        </div>
        
        <div className="flex items-center">
          {/* 悬停消息显示气泡 */}
          {hoveredMessage && (
            <div 
              className="mr-4 px-4 py-2 rounded-lg text-sm flex items-center"
              style={{
                backgroundColor: compactMode ? 'transparent' : 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                maxWidth: '350px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                boxShadow: compactMode ? 'none' : 'var(--shadow-md)',
                height: '36px',
                fontSize: '13px'
              }}
            >
              <span>{hoveredMessage}</span>
            </div>
          )}

          {/* Compact Mode Button */}
          <button
            onClick={() => setCompactMode(!compactMode)}
            className="mr-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{
              backgroundColor: compactMode ? 'var(--primary-color)' : 'var(--bg-secondary)',
              color: compactMode ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
            title={compactMode ? '退出简洁模式' : '进入简洁模式'}
          >
            <Square size={14} />
            简洁
          </button>

          {/* Model Selector */}
          <div className="relative">
          <button
            onClick={() => setShowModelSelect(!showModelSelect)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{
              backgroundColor: compactMode ? 'transparent' : 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Sparkles size={14} style={{ color: 'var(--primary-color)' }} />
            <span>{activeOllamaModel || activeModel?.name || '选择模型'}</span>
            <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
          </button>

          <AnimatePresence>
            {showModelSelect && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full z-50 mt-2 w-[480px] max-h-80 overflow-hidden rounded-xl"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--border-color)' }}>
                  {/* 左侧：Ollama 本地模型 */}
                  <div className="flex flex-col">
                    <div className="px-3 py-2 text-xs font-medium shrink-0" style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-primary)' }}>
                      <div className="flex items-center gap-1.5">
                        <HardDrive size={12} />
                        Ollama 本地模型
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-64 flex-1">
                      {ollamaStatus?.isRunning && ollamaModels.length > 0 ? (
                        ollamaModels.map((model: any) => (
                          <button
                            key={`ollama-${model.name}`}
                            onClick={() => handleSwitchOllamaModel(model.name)}
                            disabled={switchingModel}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors disabled:opacity-50"
                            style={{
                              backgroundColor: model.name === activeOllamaModel ? 'var(--primary-light)' : 'transparent',
                            }}
                          >
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shrink-0"
                              style={{
                                backgroundColor: 'rgba(0,180,42,0.1)',
                                color: 'var(--success-color)',
                              }}
                            >
                              {model.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {model.name}
                              </div>
                              <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                                {model.details?.parameter_size || '未知大小'}
                              </div>
                            </div>
                            {model.name === activeOllamaModel && (
                              <Check size={14} className="shrink-0" style={{ color: 'var(--primary-color)' }} />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                          <HardDrive size={24} className="mb-2 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
                          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {ollamaStatus?.isRunning ? '暂无本地模型' : 'Ollama 未连接'}
                          </div>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>
                            请在模型管理中启动 Ollama
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右侧：远程模型 */}
                  <div className="flex flex-col">
                    <div className="px-3 py-2 text-xs font-medium shrink-0" style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-primary)' }}>
                      <div className="flex items-center gap-1.5">
                        <Globe size={12} />
                        远程模型
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-64 flex-1">
                      {models.filter(m => m.isActive).length > 0 ? (
                        models.filter(m => m.isActive).map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              setActiveModel(model.id);
                              setActiveOllamaModel(null);
                              setShowModelSelect(false);
                              toast.success(`已切换到 ${model.name}`, { duration: 2000 });
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                            style={{
                              backgroundColor: model.id === activeModelId && !activeOllamaModel ? 'var(--primary-light)' : 'transparent',
                            }}
                          >
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shrink-0"
                              style={{
                                backgroundColor: 'var(--primary-light)',
                                color: 'var(--primary-color)',
                              }}
                            >
                              {model.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {model.name}
                              </div>
                              <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                                {model.provider}
                              </div>
                            </div>
                            {model.id === activeModelId && !activeOllamaModel && (
                              <Check size={14} className="shrink-0" style={{ color: 'var(--primary-color)' }} />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                          <Globe size={24} className="mb-2 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
                          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            暂无远程模型
                          </div>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>
                            请在模型管理中添加
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Nav Toggle Button */}
        <button
          onClick={() => setShowNav(!showNav)}
          className="ml-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
          style={{
            backgroundColor: showNav ? 'var(--primary-color)' : (compactMode ? 'transparent' : 'var(--bg-secondary)'),
            color: showNav ? 'white' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
          title={showNav ? '隐藏导航' : '显示导航'}
        >
          <RotateCcw size={14} />
          导航点
        </button>
        </div>
      </header>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto no-select"
        style={{
          backgroundColor: 'transparent',
        }}
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
                compactMode={compactMode}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div
        className="p-4 no-select"
        style={{
          backgroundColor: compactMode ? 'transparent' : 'var(--bg-primary)',
        }}
      >
        <div className="mx-auto max-w-4xl">
          <div
            className="flex items-end gap-2 rounded-2xl p-3"
            style={{
              backgroundColor: compactMode ? 'transparent' : 'var(--bg-secondary)',
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
        </div>
      </div>
    </div>
  );
}
