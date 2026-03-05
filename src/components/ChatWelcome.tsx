import { MessageSquare, Sparkles, Bot, Zap, Shield, ArrowRight, Cpu, Brain, Timer, Image as ImageIcon, Code, BookOpen, PenTool, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/store';

interface ChatWelcomeProps {
  onStartChat: () => void;
  onSuggestionClick?: (text: string) => void;
}

export function ChatWelcome({ onStartChat, onSuggestionClick }: ChatWelcomeProps) {
  const { activeOllamaModel, ollamaStatus, ollamaModels } = useStore();

  const suggestions = [
    { icon: <Code size={16} />, text: '帮我写一个 Python 排序算法' },
    { icon: <BookOpen size={16} />, text: '解释一下量子计算的原理' },
    { icon: <PenTool size={16} />, text: '写一篇关于人工智能的文章' },
    { icon: <ImageIcon size={16} />, text: '分析这张图片的内容' },
  ];

  const stats = [
    { value: ollamaModels.length, label: '可用模型' },
    { value: '100%', label: '本地运行' },
    { value: '∞', label: '对话次数' },
  ];

  return (
    <div 
      className="flex-1 flex flex-col overflow-hidden relative"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[100px] animate-pulse"
          style={{ 
            backgroundColor: 'var(--primary-color)',
            opacity: 0.08,
            animationDuration: '4s',
          }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[80px]"
          style={{ 
            backgroundColor: '#8b5cf6',
            opacity: 0.06,
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl"
        >
          {/* Hero Section */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
              style={{ 
                background: 'linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 50%, #ec4899 100%)',
                boxShadow: '0 12px 40px -12px rgba(139, 92, 246, 0.5)',
              }}
            >
              <Sparkles size={28} color="white" />
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-4xl font-bold mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              你好，我是 AI 助手
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-base max-w-md mx-auto"
              style={{ color: 'var(--text-secondary)' }}
            >
              基于 Ollama 本地运行，安全、私密、强大。有什么我可以帮助你的吗？
            </motion.p>
          </div>

          {/* Status Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="flex items-center justify-center gap-6 mb-8"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div 
                  className="text-2xl font-bold"
                  style={{ color: 'var(--primary-color)' }}
                >
                  {stat.value}
                </div>
                <div 
                  className="text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Input Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            onClick={onStartChat}
            className="relative mb-6 cursor-pointer group"
          >
            <div 
              className="flex items-center gap-3 p-4 rounded-2xl transition-all group-hover:shadow-lg"
              style={{ 
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--primary-light)' }}
              >
                <MessageSquare size={18} style={{ color: 'var(--primary-color)' }} />
              </div>
              <span 
                className="flex-1 text-sm"
                style={{ color: 'var(--text-tertiary)' }}
              >
                输入消息开始对话...
              </span>
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-105"
                style={{ 
                  backgroundColor: 'var(--primary-color)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
              >
                <ArrowRight size={18} color="white" />
              </div>
            </div>
          </motion.div>

          {/* Suggestions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="space-y-2"
          >
            <div 
              className="text-xs font-medium text-center mb-3"
              style={{ color: 'var(--text-tertiary)' }}
            >
              试试这些
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.55 + index * 0.05 }}
                  onClick={() => {
                    if (onSuggestionClick) {
                      onSuggestionClick(suggestion.text);
                    } else {
                      onStartChat();
                    }
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>{suggestion.icon}</span>
                  </div>
                  <span 
                    className="text-sm truncate"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {suggestion.text}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Model Status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-8 flex items-center justify-center gap-2"
          >
            <div 
              className={`w-2 h-2 rounded-full ${ollamaStatus?.isRunning ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: ollamaStatus?.isRunning ? 'var(--success-color)' : 'var(--error-color)' }}
            />
            <span 
              className="text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {ollamaStatus?.isRunning 
                ? <>{activeOllamaModel || `${ollamaModels.length} 个模型可用`} · 点击开始</>
                : 'Ollama 未运行，请先启动服务'
              }
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="flex items-center justify-center gap-8 py-6 px-6 relative z-10"
        style={{ 
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        {[
          { icon: <Shield size={16} />, text: '本地运行' },
          { icon: <Brain size={16} />, text: '深度思考' },
          { icon: <Timer size={16} />, text: '性能监控' },
          { icon: <ImageIcon size={16} />, text: '图像识别' },
        ].map((item, index) => (
          <div 
            key={index}
            className="flex items-center gap-2"
          >
            <span style={{ color: 'var(--text-tertiary)' }}>{item.icon}</span>
            <span 
              className="text-xs hidden sm:inline"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {item.text}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
