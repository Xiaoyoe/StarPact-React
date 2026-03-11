import { useState, memo, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, Brain, ChevronRight, Copy, Check, RotateCcw, Trash2 } from 'lucide-react';
import type { ChatMessage } from '@/store';
import { cn } from '@/utils/cn';

const markdownCache = new Map<string, React.ReactNode>();
const MAX_CACHE_SIZE = 100;

const getCachedMarkdown = (content: string): React.ReactNode | null => {
  return markdownCache.get(content) || null;
};

const setCachedMarkdown = (content: string, node: React.ReactNode) => {
  if (markdownCache.size >= MAX_CACHE_SIZE) {
    const firstKey = markdownCache.keys().next().value;
    if (firstKey) {
      markdownCache.delete(firstKey);
    }
  }
  markdownCache.set(content, node);
};

const CodeBlock = memo(function CodeBlock({ language, children }: { language: string; children: string }) {
  const lineCount = children.split('\n').length;
  
  return (
    <div className="relative my-4 rounded-xl overflow-hidden" style={{ backgroundColor: '#1e1e2e' }}>
      <div className="flex items-center justify-between px-4 py-2 text-xs" style={{ backgroundColor: '#181825', color: '#6c7086' }}>
        <span>{language}</span>
        <button
          onClick={() => navigator.clipboard.writeText(children)}
          className="flex items-center gap-1 px-2 py-1 rounded transition-colors hover:bg-white/10"
        >
          <Copy size={12} />
          复制
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
          background: '#1e1e2e',
        }}
        showLineNumbers={lineCount > 5}
        codeTagProps={{
          style: {
            fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
          }
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
});

const StreamingText = memo(function StreamingText({ content, className }: { content: string; className?: string }) {
  const contentRef = useRef(content);
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    if (contentRef.current !== content) {
      contentRef.current = content;
      forceUpdate({});
    }
  }, [content]);
  
  return (
    <div className={cn("whitespace-pre-wrap text-sm leading-relaxed copy-allowed typing-cursor", className)} style={{ userSelect: 'text' }}>
      {content}
    </div>
  );
});

const CachedMarkdown = memo(function CachedMarkdown({ 
  content, 
  isStreaming, 
  isLast 
}: { 
  content: string; 
  isStreaming?: boolean; 
  isLast: boolean;
}) {
  const components = useMemo(() => ({
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      if (match) {
        return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
      }
      return <code className={className} {...props}>{children}</code>;
    },
  }), []);

  const cached = getCachedMarkdown(content);
  
  if (cached && !isStreaming) {
    return (
      <div className={cn("markdown-body copy-allowed")} style={{ userSelect: 'text' }}>
        {cached}
      </div>
    );
  }

  const markdownNode = (
    <div className={cn("markdown-body copy-allowed", isStreaming && isLast && 'typing-cursor')} style={{ userSelect: 'text' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );

  if (!isStreaming && content.length > 50) {
    setCachedMarkdown(content, markdownNode);
  }

  return markdownNode;
});

interface MessageBubbleProps {
  message: ChatMessage;
  isLast: boolean;
  compactMode: boolean;
  onImageClick: (images: string[], index: number) => void;
  onRegenerate?: (content: string, images?: string[]) => void;
  onDelete?: (messageId: string) => void;
  streamingContent?: string;
  streamingThinking?: string;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isLast,
  compactMode,
  onImageClick,
  onRegenerate,
  onDelete,
  streamingContent,
  streamingThinking,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [showActions, setShowActions] = useState(true);
  const [showThinking, setShowThinking] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const isCurrentlyStreaming = message.isStreaming && isLast;
  const displayContent = isCurrentlyStreaming && streamingContent !== undefined 
    ? streamingContent 
    : message.content;
  const displayThinking = isCurrentlyStreaming && streamingThinking !== undefined
    ? streamingThinking
    : message.thinking;

  const formatTime = useCallback((ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const handleImageClick = useCallback((idx: number) => {
    if (message.images) {
      onImageClick(message.images, idx);
    }
  }, [message.images, onImageClick]);

  const handleRegenerate = useCallback(() => {
    if (onRegenerate) {
      onRegenerate(message.content, message.images);
    }
  }, [message.content, message.images, onRegenerate]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(message.id);
    }
  }, [message.id, onDelete]);

  const shouldUseSimpleRender = isCurrentlyStreaming && displayContent.length < 800;
  const shouldUseSimpleThinking = isCurrentlyStreaming && (displayThinking?.length || 0) < 800;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn("group flex gap-3 px-4 py-3", isUser ? "flex-row-reverse" : "flex-row")}
      data-message-id={message.id}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: isUser ? 'var(--primary-color)' : 'var(--bg-tertiary)' }}
      >
        {isUser ? <User size={16} color="white" /> : <Bot size={16} style={{ color: 'var(--primary-color)' }} />}
      </div>

      <div className={cn("max-w-[75%] min-w-0", isUser ? "items-end" : "items-start")}>
        <div className={cn("mb-1 flex items-center gap-2 text-xs", isUser ? "flex-row-reverse" : "flex-row")} style={{ color: 'var(--text-tertiary)' }}>
          <span className="font-medium">{isUser ? '你' : (message.modelName || 'AI')}</span>
          <span>{formatTime(message.timestamp)}</span>
        </div>

        <div
          className={cn("relative rounded-2xl px-4 py-3 copy-allowed", isUser ? "rounded-tr-md" : "rounded-tl-md")}
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
                      onClick={() => handleImageClick(idx)}
                    />
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm leading-relaxed copy-allowed" style={{ userSelect: 'text' }}>{message.content}</p>
            </div>
          ) : (
            <>
              {displayThinking && (
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
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{displayThinking.length} 字符</span>
                    <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', transform: showThinking ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  </button>
                  <AnimatePresence>
                    {showThinking && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-xl p-4 text-sm leading-relaxed max-h-80 overflow-y-auto" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                            <div className={cn("w-2 h-2 rounded-full", isCurrentlyStreaming && "animate-pulse")} style={{ backgroundColor: 'var(--primary-color)' }} />
                            <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                              {isCurrentlyStreaming ? 'AI 正在思考...' : '思考完成'}
                            </span>
                          </div>
                          {shouldUseSimpleThinking ? (
                            <StreamingText content={displayThinking} />
                          ) : (
                            <CachedMarkdown content={displayThinking} isStreaming={isCurrentlyStreaming} isLast={false} />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {shouldUseSimpleRender ? (
                <StreamingText content={displayContent} />
              ) : (
                <CachedMarkdown content={displayContent} isStreaming={isCurrentlyStreaming} isLast={isLast} />
              )}
            </>
          )}
        </div>

        <AnimatePresence>
          {showActions && !message.isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={cn("mt-1 flex items-center gap-1", isUser ? "justify-end" : "justify-start")}
            >
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-tertiary)' }}
                title="复制"
              >
                {copied ? <Check size={12} style={{ color: 'var(--success-color)' }} /> : <Copy size={12} />}
              </button>
              {isUser && onRegenerate && (
                <button
                  onClick={handleRegenerate}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-white/10"
                  style={{ color: 'var(--text-tertiary)' }}
                  title="重新生成"
                >
                  <RotateCcw size={12} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-white/10"
                  style={{ color: 'var(--text-tertiary)' }}
                  title="删除"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

export function clearMarkdownCache() {
  markdownCache.clear();
}
