import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Paperclip, Settings2, Square, Copy, Check, RotateCcw,
  ChevronDown, Sparkles, Bot, User, HardDrive, Globe, Brain, ChevronRight, Pencil, Timer, X, Image as ImageIcon, MessageSquare, Trash2
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
import { PerformanceModal } from '@/components/PerformanceModal';
import { ImageViewer } from '@/components/ImageViewer';
import { ChatWelcome } from '@/components/ChatWelcome';
import { ollamaModelService } from '@/services/OllamaModelService';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { estimateConversationTokens, formatTokenCount } from '@/utils/tokenEstimator';

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

function MessageBubble({ message, isLast, compactMode, onImageClick, onRegenerate, onDelete }: { 
  message: ChatMessage; 
  isLast: boolean; 
  compactMode: boolean;
  onImageClick: (images: string[], index: number) => void;
  onRegenerate?: (content: string) => void;
  onDelete?: (messageId: string) => void;
}) {
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
            <div className="space-y-2">
              {message.images && message.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.images.map((img, idx) => (
                    <img 
                      key={idx}
                      src={img} 
                      alt={`图片 ${idx + 1}`}
                      className="max-w-[200px] max-h-[200px] object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ borderColor: 'var(--border-color)' }}
                      onClick={() => onImageClick(message.images!, idx)}
                    />
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm leading-relaxed copy-allowed" style={{ userSelect: 'text' }}>{message.content}</p>
            </div>
          ) : (
            <>
              {/* Thinking Section */}
              {message.thinking && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowThinking(!showThinking)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all w-full"
                    style={{ 
                      color: showThinking ? 'var(--primary-color)' : 'var(--text-secondary)',
                      backgroundColor: showThinking ? 'var(--primary-light)' : 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <Brain size={14} style={{ color: 'var(--primary-color)' }} />
                    <span className="flex-1 text-left">思考过程</span>
                    {message.thinkingDuration && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--success-color)', backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                        {message.thinkingDuration.toFixed(1)}s
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {message.thinking.length} 字符
                    </span>
                    <ChevronRight 
                      size={14} 
                      style={{ 
                        color: 'var(--text-tertiary)',
                        transform: showThinking ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }} 
                    />
                  </button>
                  <AnimatePresence>
                    {showThinking && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div 
                          className="rounded-xl p-4 text-sm leading-relaxed max-h-80 overflow-y-auto"
                          style={{ 
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary-color)' }} />
                            <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>AI 正在思考...</span>
                          </div>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              code: ({ className, children, ...props }) => {
                                const match = /language-(\w+)/.exec(className || '');
                                const codeString = String(children).replace(/\n$/, '');
                                if (match) {
                                  return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
                                }
                                return <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }} {...props}>{children}</code>;
                              },
                            }}
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
              <button
                onClick={() => navigator.clipboard.writeText(message.content)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-tertiary)' }}
                title="复制"
              >
                <Copy size={12} />
              </button>
              <button
                onClick={() => onDelete?.(message.id)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-tertiary)' }}
                title="删除"
              >
                <Trash2 size={12} />
              </button>
              {isUser && onRegenerate && (
                <button
                  onClick={() => onRegenerate(message.content)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-white/10"
                  style={{ color: 'var(--text-tertiary)' }}
                  title="重新生成"
                >
                  <RotateCcw size={12} />
                </button>
              )}
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
    addMessage, updateMessage, deleteMessage, addConversation, updateConversation,
    addLog,
    chatWallpaper, setChatWallpaper,
    compactMode, setCompactMode,
    ollamaModels, activeOllamaModel, setActiveOllamaModel,
    ollamaStatus,
    ollamaVerboseMode, setPerformanceMetrics,
    ollamaThinkMode,
    ollamaChatMode,
    showTokenEstimate,
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
  const [showPerfPanel, setShowPerfPanel] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{ id: string; data: string; preview: string }[]>([]);
  const [imageViewerState, setImageViewerState] = useState<{
    isOpen: boolean;
    images: string[];
    currentIndex: number;
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });
  const [showWelcome, setShowWelcome] = useState(true);
  const [showChatWelcome, setShowChatWelcome] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    messageId: string | null;
  }>({
    isOpen: false,
    messageId: null,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldScrollToBottomRef = useRef(true);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const activeModel = models.find(m => m.id === activeModelId);

  const totalTokens = useMemo(() => {
    if (!activeConversation || activeConversation.messages.length === 0) return 0;
    const stableMessages = activeConversation.messages.filter(msg => !msg.isStreaming);
    return estimateConversationTokens(stableMessages);
  }, [activeConversation?.messages.filter(msg => !msg.isStreaming).map(m => m.id + m.content.length).join(',')]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (shouldScrollToBottomRef.current) {
      scrollToBottom();
    }
  }, [activeConversation?.messages, scrollToBottom]);

  useEffect(() => {
    const savedWallpaper = configStorage.get('chatWallpaper');
    if (savedWallpaper) {
      setChatWallpaper(savedWallpaper);
    }
    
    const savedShowWelcome = configStorage.get('showChatWelcome');
    if (savedShowWelcome !== undefined) {
      setShowChatWelcome(savedShowWelcome);
      setShowWelcome(savedShowWelcome);
    } else {
      setShowWelcome(true);
    }
    
    const chatNotification = configStorage.get('chatNotification');
    if (chatNotification?.enabled) {
      notificationService.requestPermission();
    }
  }, []);

  const handleSwitchOllamaModel = async (newModelName: string) => {
    if (ollamaModelService.isSwitching()) {
      toast.info('正在切换模型中，请稍候', { duration: 2000 });
      return;
    }

    await ollamaModelService.switchModel(
      newModelName,
      toast,
      () => {
        setShowModelSelect(false);
      },
      () => {
        // 错误处理已在服务中完成
      }
    );
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
      images: uploadedImages.length > 0 ? uploadedImages.map(img => img.data) : undefined,
    };
    addMessage(convId, userMsg);
    setInputValue('');
    
    const currentImages = [...uploadedImages];
    setUploadedImages([]);
    
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
        const imageBase64List = currentImages.map(img => {
          const base64Match = img.data.match(/^data:image\/\w+;base64,(.+)$/);
          return base64Match ? base64Match[1] : img.data;
        });

        if (ollamaChatMode === 'multi') {
          const messages: Array<{ role: string; content: string; images?: string[] }> = [];
          
          const currentConv = conversations.find(c => c.id === convId);
          if (currentConv) {
            currentConv.messages.forEach(msg => {
              if (!msg.isStreaming) {
                let processedImages: string[] | undefined = undefined;
                if (msg.images && msg.images.length > 0) {
                  processedImages = msg.images.map(img => {
                    const base64Match = img.match(/^data:image\/\w+;base64,(.+)$/);
                    return base64Match ? base64Match[1] : img;
                  });
                }
                messages.push({
                  role: msg.role,
                  content: msg.content,
                  images: processedImages,
                });
              }
            });
          }
          
          messages.push({
            role: 'user',
            content: userInput,
            images: imageBase64List.length > 0 ? imageBase64List : undefined,
          });

          const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: activeOllamaModel,
              messages: messages,
              stream: true,
              think: ollamaThinkMode,
            }),
          });

          if (response.ok) {
            setIsStreaming(true);
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            let thinkingContent = '';
            let startTime = Date.now();
            let thinkingStartTime = 0;
            let thinkingDuration = 0;
            let firstTokenTime = 0;
            let lastPerfData: any = null;

            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                  try {
                    const data = JSON.parse(line);
                    
                    if (data.message?.content) {
                      const token = data.message.content;
                      
                      if (firstTokenTime === 0) {
                        firstTokenTime = (Date.now() - startTime) / 1000;
                      }
                      
                      fullResponse += token;
                    }
                    
                    const thinkingData = data.thinking || data.message?.thinking;
                    if (thinkingData) {
                      if (thinkingStartTime === 0) {
                        thinkingStartTime = Date.now();
                      }
                      thinkingContent += thinkingData;
                      thinkingDuration = (Date.now() - thinkingStartTime) / 1000;
                    }
                    
                    if (data.message?.content || thinkingData) {
                      let displayContent = fullResponse;
                      let currentThinking = thinkingContent;
                      
                      if (!currentThinking) {
                        const thinkMatch = fullResponse.match(/<think&gt;([\s\S]*?)(<\/think&gt;|$)/);
                        if (thinkMatch) {
                          currentThinking = thinkMatch[1];
                          if (fullResponse.includes('</think&gt;')) {
                            displayContent = fullResponse.replace(/<think&gt;[\s\S]*?<\/think&gt;/, '').trim();
                          } else {
                            displayContent = '';
                          }
                        }
                      }

                      if (thinkingStartTime > 0 && !thinkingData && data.message?.content) {
                      }

                      updateMessage(convId, aiMsgId, {
                        content: displayContent,
                        thinking: currentThinking,
                        thinkingDuration: thinkingDuration > 0 ? thinkingDuration : undefined,
                        isStreaming: true,
                      });
                    }
                    
                    if (data.done && ollamaVerboseMode) {
                      lastPerfData = data;
                    }
                  } catch (e) {
                    // 忽略解析错误
                  }
                }
              }
            }

            let finalResponse = fullResponse;
            let finalThinking = thinkingContent;
            let finalThinkingDuration = thinkingDuration;
            
            if (!finalThinking) {
              const thinkMatch = fullResponse.match(/<think&gt;([\s\S]*?)<\/think&gt;/);
              if (thinkMatch) {
                finalThinking = thinkMatch[1].trim();
                finalResponse = fullResponse.replace(/<think&gt;[\s\S]*?<\/think&gt;/, '').trim();
              }
            }

            updateMessage(convId, aiMsgId, {
              content: finalResponse,
              thinking: finalThinking,
              thinkingDuration: finalThinkingDuration > 0 ? finalThinkingDuration : undefined,
              isStreaming: false,
            });

            setIsStreaming(false);
            
            if (ollamaVerboseMode && lastPerfData) {
              const totalDuration = lastPerfData.total_duration ? lastPerfData.total_duration / 1e9 : 0;
              const loadDuration = lastPerfData.load_duration ? lastPerfData.load_duration / 1e9 : 0;
              const promptEvalDuration = lastPerfData.prompt_eval_duration ? lastPerfData.prompt_eval_duration / 1e9 : 0;
              const evalDuration = lastPerfData.eval_duration ? lastPerfData.eval_duration / 1e9 : 0;
              const evalCount = lastPerfData.eval_count || 0;
              const promptEvalCount = lastPerfData.prompt_eval_count || 0;
              const throughput = evalDuration > 0 ? evalCount / evalDuration : 0;
              
              setPerformanceMetrics({
                requestId: `req-${Date.now().toString(36)}`,
                modelLoadTime: loadDuration,
                inferenceTime: evalDuration,
                totalTokens: evalCount + promptEvalCount,
                throughput: throughput,
                firstTokenTime: firstTokenTime,
                promptTokens: promptEvalCount,
                completionTokens: evalCount,
                memoryUsage: '-',
                gpuUsage: '-',
                temperature: 0.7,
                topP: 0.9,
              });
              
              toast.success(`${activeOllamaModel} 回复完成 (${throughput.toFixed(1)} tokens/s)`, { duration: 2000 });
            } else {
              toast.success(`${activeOllamaModel} 回复完成`, { duration: 2000 });
            }
            
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
        } else {
          const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: activeOllamaModel,
              prompt: userInput,
              stream: true,
              think: ollamaThinkMode,
              images: imageBase64List.length > 0 ? imageBase64List : undefined,
            }),
          });

        if (response.ok) {
          setIsStreaming(true);
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let fullResponse = '';
          let thinkingContent = '';
          let startTime = Date.now();
          let thinkingStartTime = 0;
          let thinkingDuration = 0;
          let firstTokenTime = 0;
          let lastPerfData: any = null;

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
                    
                    if (firstTokenTime === 0) {
                      firstTokenTime = (Date.now() - startTime) / 1000;
                    }
                    
                    fullResponse += token;
                  }
                  
                  const thinkingData = data.thinking;
                  if (thinkingData) {
                    if (thinkingStartTime === 0) {
                      thinkingStartTime = Date.now();
                    }
                    thinkingContent += thinkingData;
                    thinkingDuration = (Date.now() - thinkingStartTime) / 1000;
                  }
                  
                  if (data.response || thinkingData) {
                    let displayContent = fullResponse;
                    let currentThinking = thinkingContent;
                    
                    if (!currentThinking) {
                      const thinkMatch = fullResponse.match(/<think&gt;([\s\S]*?)(<\/think&gt;|$)/);
                      if (thinkMatch) {
                        currentThinking = thinkMatch[1];
                        if (fullResponse.includes('</think&gt;')) {
                          displayContent = fullResponse.replace(/<think&gt;[\s\S]*?<\/think&gt;/, '').trim();
                        } else {
                          displayContent = '';
                        }
                      }
                    }

                    updateMessage(convId, aiMsgId, {
                      content: displayContent,
                      thinking: currentThinking,
                      thinkingDuration: thinkingDuration > 0 ? thinkingDuration : undefined,
                      isStreaming: true,
                    });
                  }
                  
                  if (data.done && ollamaVerboseMode) {
                    lastPerfData = data;
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }

          let finalResponse = fullResponse;
          let finalThinking = thinkingContent;
          let finalThinkingDuration = thinkingDuration;
          
          if (!finalThinking) {
            const thinkMatch = fullResponse.match(/<think&gt;([\s\S]*?)<\/think&gt;/);
            if (thinkMatch) {
              finalThinking = thinkMatch[1].trim();
              finalResponse = fullResponse.replace(/<think&gt;[\s\S]*?<\/think&gt;/, '').trim();
            }
          }

          updateMessage(convId, aiMsgId, {
            content: finalResponse,
            thinking: finalThinking,
            thinkingDuration: finalThinkingDuration > 0 ? finalThinkingDuration : undefined,
            isStreaming: false,
          });

          setIsStreaming(false);
          
          if (ollamaVerboseMode && lastPerfData) {
            const totalDuration = lastPerfData.total_duration ? lastPerfData.total_duration / 1e9 : 0;
            const loadDuration = lastPerfData.load_duration ? lastPerfData.load_duration / 1e9 : 0;
            const promptEvalDuration = lastPerfData.prompt_eval_duration ? lastPerfData.prompt_eval_duration / 1e9 : 0;
            const evalDuration = lastPerfData.eval_duration ? lastPerfData.eval_duration / 1e9 : 0;
            const evalCount = lastPerfData.eval_count || 0;
            const promptEvalCount = lastPerfData.prompt_eval_count || 0;
            const throughput = evalDuration > 0 ? evalCount / evalDuration : 0;
            
            setPerformanceMetrics({
              requestId: `req-${Date.now().toString(36)}`,
              modelLoadTime: loadDuration,
              inferenceTime: evalDuration,
              totalTokens: evalCount + promptEvalCount,
              throughput: throughput,
              firstTokenTime: firstTokenTime,
              promptTokens: promptEvalCount,
              completionTokens: evalCount,
              memoryUsage: '-',
              gpuUsage: '-',
              temperature: 0.7,
              topP: 0.9,
            });
            
            toast.success(`${activeOllamaModel} 回复完成 (${throughput.toFixed(1)} tokens/s)`, { duration: 2000 });
          } else {
            toast.success(`${activeOllamaModel} 回复完成`, { duration: 2000 });
          }
          
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error('只支持图片文件', { duration: 2000 });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('图片大小不能超过 10MB', { duration: 2000 });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        setUploadedImages(prev => [...prev, {
          id: generateId(),
          data: data,
          preview: data,
        }]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleClearImages = () => {
    setUploadedImages([]);
  };

  const openImageViewer = (images: string[], index: number) => {
    setImageViewerState({
      isOpen: true,
      images,
      currentIndex: index,
    });
  };

  const closeImageViewer = () => {
    setImageViewerState(prev => ({ ...prev, isOpen: false }));
  };

  const handlePrevImage = () => {
    setImageViewerState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.images.length - 1,
    }));
  };

  const handleNextImage = () => {
    setImageViewerState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex < prev.images.length - 1 ? prev.currentIndex + 1 : 0,
    }));
  };

  const handleJumpToImage = (index: number) => {
    setImageViewerState(prev => ({
      ...prev,
      currentIndex: index,
    }));
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

  const handleStartChat = () => {
    setShowWelcome(false);
  };

  const handleSuggestionClick = (text: string) => {
    setInputValue(text);
    setShowWelcome(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleRegenerate = (content: string) => {
    setInputValue(content);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleDeleteMessage = (messageId: string) => {
    setDeleteConfirm({
      isOpen: true,
      messageId,
    });
  };

  const confirmDeleteMessage = () => {
    if (deleteConfirm.messageId && activeConversationId) {
      shouldScrollToBottomRef.current = false;
      deleteMessage(activeConversationId, deleteConfirm.messageId);
      toast.success('消息已删除');
      setTimeout(() => {
        shouldScrollToBottomRef.current = true;
      }, 100);
    }
    setDeleteConfirm({ isOpen: false, messageId: null });
  };

  const cancelDeleteMessage = () => {
    setDeleteConfirm({ isOpen: false, messageId: null });
  };

  if (showWelcome && showChatWelcome) {
    return (
      <div className="flex h-full flex-col no-select" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <ChatWelcome onStartChat={handleStartChat} onSuggestionClick={handleSuggestionClick} />
      </div>
    );
  }

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
          {showTokenEstimate && activeConversation && activeConversation.messages.length > 0 && !isEditingTitle && (
            <span className="text-xs ml-2 px-2 py-0.5 rounded" style={{ color: 'var(--primary-color)', backgroundColor: 'var(--primary-light)' }}>
              {formatTokenCount(totalTokens)}
            </span>
          )}
          {activeConversation && activeConversation.messages.length > 0 && !isEditingTitle && (
            <span className="text-xs ml-2 px-2 py-0.5 rounded flex items-center gap-1" style={{ color: ollamaThinkMode ? 'var(--success-color)' : 'var(--text-tertiary)', backgroundColor: ollamaThinkMode ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-tertiary)' }}>
              <Brain size={10} />
              {ollamaThinkMode ? '思考' : '无思考'}
            </span>
          )}
          {activeConversation && activeConversation.messages.length > 0 && !isEditingTitle && (
            <span className="text-xs ml-2 px-2 py-0.5 rounded flex items-center gap-1" style={{ color: ollamaChatMode === 'multi' ? 'var(--success-color)' : 'var(--text-tertiary)', backgroundColor: ollamaChatMode === 'multi' ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-tertiary)' }}>
              <MessageSquare size={10} />
              {ollamaChatMode === 'multi' ? '多轮' : '单轮'}
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

          {/* Welcome Page Toggle Button */}
          <button
            onClick={() => {
              const newValue = !showChatWelcome;
              setShowChatWelcome(newValue);
              setShowWelcome(newValue);
              configStorage.set('showChatWelcome', newValue);
              toast.info(newValue ? '已开启欢迎页面' : '已关闭欢迎页面', { duration: 2000 });
            }}
            className="mr-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{
              backgroundColor: showChatWelcome ? 'var(--primary-color)' : 'var(--bg-secondary)',
              color: showChatWelcome ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
            title={showChatWelcome ? '关闭欢迎页面' : '开启欢迎页面'}
          >
            <MessageSquare size={14} />
            欢迎
          </button>

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

        {/* Performance Panel Toggle Button */}
        <button
          onClick={() => setShowPerfPanel(!showPerfPanel)}
          className="ml-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
          style={{
            backgroundColor: showPerfPanel ? 'var(--primary-color)' : (compactMode ? 'transparent' : 'var(--bg-secondary)'),
            color: showPerfPanel ? 'white' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
          title={showPerfPanel ? '隐藏性能面板' : '显示性能面板'}
        >
          <Timer size={14} />
          性能
        </button>
        </div>
      </header>

      <PerformanceModal isOpen={showPerfPanel} onClose={() => setShowPerfPanel(false)} />

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
                onImageClick={openImageViewer}
                onRegenerate={handleRegenerate}
                onDelete={handleDeleteMessage}
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
          {/* Image Preview Area */}
          {uploadedImages.length > 0 && (
            <div 
              className="mb-2 flex flex-wrap gap-2 p-2 rounded-xl"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              {uploadedImages.map((img) => (
                <div 
                  key={img.id} 
                  className="relative group"
                >
                  <img 
                    src={img.preview} 
                    alt="上传的图片" 
                    className="h-16 w-16 object-cover rounded-lg border"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                  <button
                    onClick={() => handleRemoveImage(img.id)}
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: 'var(--error-color)', color: 'white' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={handleClearImages}
                className="h-16 px-3 flex items-center gap-1 rounded-lg text-xs transition-colors"
                style={{ 
                  color: 'var(--text-tertiary)', 
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <X size={14} />
                清空
              </button>
            </div>
          )}

          <div
            className="flex items-end gap-2 rounded-2xl p-3"
            style={{
              backgroundColor: compactMode ? 'transparent' : 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-opacity-80"
              style={{ 
                color: uploadedImages.length > 0 ? 'var(--primary-color)' : 'var(--text-tertiary)',
                backgroundColor: uploadedImages.length > 0 ? 'var(--primary-light)' : 'transparent'
              }}
              title="上传图片"
            >
              <ImageIcon size={18} />
            </button>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={uploadedImages.length > 0 ? "描述图片内容或输入问题..." : "输入消息... (Shift+Enter 换行)"}
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
              disabled={(!inputValue.trim() && uploadedImages.length === 0) && !isStreaming}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95"
              style={{
                backgroundColor: (inputValue.trim() || isStreaming || uploadedImages.length > 0) ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                color: (inputValue.trim() || isStreaming || uploadedImages.length > 0) ? 'white' : 'var(--text-tertiary)',
                cursor: (!inputValue.trim() && uploadedImages.length === 0 && !isStreaming) ? 'not-allowed' : 'pointer',
              }}
            >
              {isStreaming ? <Square size={16} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Image Viewer */}
      <ImageViewer
        images={imageViewerState.images}
        currentIndex={imageViewerState.currentIndex}
        isOpen={imageViewerState.isOpen}
        onClose={closeImageViewer}
        onPrev={handlePrevImage}
        onNext={handleNextImage}
        onJumpTo={handleJumpToImage}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="删除消息"
        message="确定要删除这条消息吗？删除后将无法恢复。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDeleteMessage}
        onCancel={cancelDeleteMessage}
      />
    </div>
  );
}
