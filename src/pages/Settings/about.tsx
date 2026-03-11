import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { configStorage } from '@/services/storage/ConfigStorage';
import {
  Sparkles,
  Cpu,
  Palette,
  Zap,
  Shield,
  Code,
  Database,
  Globe,
  Heart,
  Star,
  Layers,
  Terminal,
  MessageSquare,
  Image,
  Video,
  FileText,
  Bot,
  Settings,
  Play,
  BookOpen,
  Settings2,
  Clapperboard,
  HardDrive,
  Timer,
  Download,
  Monitor,
  Moon,
  Sun,
  Rocket,
  Box,
  ChevronRight,
  X,
  ExternalLink,
  Check,
  Info
} from 'lucide-react';

interface DevToolsStatus {
  enabled: boolean;
}

interface Feature {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
  detail: string;
}

interface Tech {
  name: string;
  version: string;
  icon: React.ElementType;
  color: string;
  desc: string;
  detail: string;
  features: string[];
}

export function AboutSection() {
  const [appNameDisplay, setAppNameDisplay] = useState<'chinese' | 'english'>('english');
  const [devToolsEnabled, setDevToolsEnabled] = useState(false);
  const [showDevToolsDialog, setShowDevToolsDialog] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [selectedTech, setSelectedTech] = useState<Tech | null>(null);
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);
  const [activeStats, setActiveStats] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      await configStorage.ready();
      const savedAppNameDisplay = configStorage.get('appNameDisplay');
      if (savedAppNameDisplay) {
        setAppNameDisplay(savedAppNameDisplay);
      }
    };
    loadConfig();

    const checkInterval = setInterval(loadConfig, 1000);
    return () => clearInterval(checkInterval);
  }, []);

  useEffect(() => {
    const checkDevToolsStatus = async () => {
      if (window.electronAPI?.devTools?.getStatus) {
        const status: DevToolsStatus = await window.electronAPI.devTools.getStatus();
        setDevToolsEnabled(status.enabled);
      }
    };
    checkDevToolsStatus();
    const interval = setInterval(checkDevToolsStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const appName = appNameDisplay === 'chinese' ? '星约' : 'Starpact';

  const handleHeaderDoubleClick = async () => {
    setShowDevToolsDialog(true);
  };

  const handleEnableDevTools = async () => {
    if (window.electronAPI?.devTools?.enable) {
      await window.electronAPI.devTools.enable();
      setDevToolsEnabled(true);
      setShowDevToolsDialog(false);
    }
  };

  const handleDisableDevTools = async () => {
    if (window.electronAPI?.devTools?.disable) {
      await window.electronAPI.devTools.disable();
      setDevToolsEnabled(false);
      setShowDevToolsDialog(false);
    }
  };

  const techStack = [
    { 
      name: 'React', 
      version: '19.2.3', 
      icon: Code, 
      color: '#61DAFB',
      desc: '用于构建用户界面的JavaScript库',
      detail: '采用最新的React 19版本，支持并发渲染、服务端组件等新特性，配合Hooks实现函数式组件开发',
      features: ['并发渲染', '服务端组件', 'Hooks API', '虚拟DOM']
    },
    { 
      name: 'TypeScript', 
      version: '5.9.3', 
      icon: Terminal, 
      color: '#3178C6',
      desc: 'JavaScript的超集，添加静态类型',
      detail: '提供强类型检查，增强代码可维护性和开发体验，减少运行时错误',
      features: ['静态类型', '类型推断', '接口定义', '泛型支持']
    },
    { 
      name: 'Electron', 
      version: '28.0.0', 
      icon: Cpu, 
      color: '#47848F',
      desc: '跨平台桌面应用开发框架',
      detail: '基于Chromium和Node.js，支持Windows、macOS、Linux多平台部署',
      features: ['跨平台', '原生API', '自动更新', '系统托盘']
    },
    { 
      name: 'Vite', 
      version: '7.2.4', 
      icon: Zap, 
      color: '#646CFF',
      desc: '下一代前端构建工具',
      detail: '极速的开发服务器启动，基于ES模块的热更新，优化的生产构建',
      features: ['极速启动', 'HMR热更新', '按需编译', '插件生态']
    },
    { 
      name: 'Tailwind CSS', 
      version: '4.1.17', 
      icon: Palette, 
      color: '#06B6D4',
      desc: '实用优先的CSS框架',
      detail: '原子化CSS类名，快速构建响应式界面，支持主题定制和暗色模式',
      features: ['原子化CSS', '响应式设计', '暗色模式', 'JIT编译']
    },
    { 
      name: 'Zustand', 
      version: '5.0.11', 
      icon: Database, 
      color: '#764ABC',
      desc: '轻量级状态管理解决方案',
      detail: '极简API，无需Provider包裹，支持中间件和持久化存储',
      features: ['极简API', '中间件', '持久化', 'DevTools']
    },
    { 
      name: 'Framer Motion', 
      version: '12.33.0', 
      icon: Sparkles, 
      color: '#FF0055',
      desc: 'React动画与手势库',
      detail: '声明式动画API，支持复杂手势交互，流畅的页面过渡效果',
      features: ['声明式动画', '手势识别', '布局动画', 'SVG路径']
    },
    { 
      name: 'IndexedDB', 
      version: 'idb 8.0.3', 
      icon: Database, 
      color: '#FFCA28',
      desc: '浏览器内置NoSQL数据库',
      detail: '大容量本地存储，支持异步操作，实现离线数据持久化',
      features: ['大容量存储', '异步API', '索引查询', '事务支持']
    },
  ];

  const mainFeatures = [
    { icon: MessageSquare, title: '智能对话', desc: '多模型AI对话，支持Ollama本地模型与远程API', color: '#3B82F6', detail: '支持OpenAI、Claude、Gemini等多种AI模型，可配置本地Ollama服务，实现智能对话、代码生成、文本分析等功能。' },
    { icon: Bot, title: '模型管理', desc: '统一的AI模型管理平台，支持多种主流模型', color: '#8B5CF6', detail: '集中管理所有AI模型配置，支持API密钥管理、模型参数调整、对话历史记录等功能。' },
    { icon: Image, title: '图片画廊', desc: '本地图片资源管理，支持浏览与分类', color: '#10B981', detail: '浏览本地图片资源，支持缩略图预览、分类管理、批量操作等功能。' },
    { icon: Play, title: '视频播放', desc: '本地视频播放器，支持多种格式', color: '#F59E0B', detail: '内置视频播放器，支持MP4、WebM、MKV等常见格式，提供播放控制、全屏播放等功能。' },
    { icon: Clapperboard, title: '媒体工具', desc: '基于FFmpeg的视频转换、音频处理工具集', color: '#EF4444', detail: '集成FFmpeg工具，支持视频格式转换、音频提取、视频压缩、GIF制作等媒体处理功能。' },
    { icon: BookOpen, title: '提示词模板', desc: '管理和使用提示词模板，提升效率', color: '#EC4899', detail: '预设常用提示词模板，支持自定义模板、分类管理、快速插入等功能，提升AI对话效率。' },
    { icon: FileText, title: '文本对比', desc: '专业的文本差异对比工具，高亮显示差异', color: '#06B6D4', detail: '对比两段文本的差异，高亮显示增删改内容，支持行级和字符级对比。' },
    { icon: Settings2, title: 'INI配置', desc: 'INI配置文件编辑器，支持语法高亮', color: '#6366F1', detail: '编辑INI格式配置文件，支持语法高亮、自动补全、格式化等功能。' },
  ];

  const quickTools = [
    { icon: Sparkles, title: '模型指示器', desc: '快速切换AI模型', color: '#FF0055' },
    { icon: Timer, title: '性能查看', desc: '运行耗时与指标', color: '#F59E0B' },
    { icon: Terminal, title: '系统日志', desc: '查看运行日志', color: '#3B82F6' },
    { icon: Palette, title: '壁纸设置', desc: '个性化界面背景', color: '#8B5CF6' },
    { icon: Database, title: '数据管理', desc: '本地存储管理', color: '#10B981' },
    { icon: Download, title: '下载指南', desc: 'Ollama与FFmpeg安装', color: '#EF4444' },
    { icon: Globe, title: '快捷网页', desc: '快速访问常用网站', color: '#06B6D4' },
    { icon: Cpu, title: 'Ollama管理', desc: '本地模型服务管理', color: '#6366F1' },
    { icon: HardDrive, title: '存储状态', desc: '查看IndexedDB状态', color: '#8B5CF6' },
    { icon: Monitor, title: '窗口大小', desc: '调整应用窗口尺寸', color: '#F97316' },
    { icon: Settings, title: '通用设置', desc: '应用基础配置', color: '#64748B' },
    { icon: Zap, title: '启动动画', desc: '自定义启动效果', color: '#EC4899' },
  ];

  const themes = [
    { name: '浅色', color: '#FFFFFF', textColor: '#000000' },
    { name: '深色', color: '#17171A', textColor: '#FFFFFF' },
    { name: '科技蓝', color: '#0A49C1', textColor: '#FFFFFF' },
    { name: '护眼绿', color: '#2A9D8F', textColor: '#FFFFFF' },
    { name: '午夜蓝', color: '#1E3A8A', textColor: '#FFFFFF' },
    { name: '森林绿', color: '#22C55E', textColor: '#FFFFFF' },
    { name: '珊瑚橙', color: '#F97316', textColor: '#FFFFFF' },
    { name: '薰衣草紫', color: '#8B5CF6', textColor: '#FFFFFF' },
    { name: '薄荷青', color: '#06B6D4', textColor: '#FFFFFF' },
    { name: '焦糖棕', color: '#D97706', textColor: '#FFFFFF' },
    { name: '樱花粉', color: '#EC4899', textColor: '#FFFFFF' },
    { name: '深海蓝', color: '#1E40AF', textColor: '#FFFFFF' },
    { name: '琥珀金', color: '#F59E0B', textColor: '#000000' },
  ];

  const storageItems = [
    { label: '应用配置', icon: Settings, size: '2KB' },
    { label: '对话记录', icon: MessageSquare, size: '动态' },
    { label: '图片库', icon: Image, size: '动态' },
    { label: '视频库', icon: Video, size: '动态' },
    { label: '提示词模板', icon: BookOpen, size: '动态' },
    { label: '模型配置', icon: Bot, size: '5KB' },
  ];

  const securityFeatures = [
    { title: '本地数据存储', desc: '所有数据存储在本地IndexedDB中，不上传服务器' },
    { title: 'API密钥安全', desc: 'API密钥加密存储，仅在需要时解密使用' },
    { title: 'IPC安全通信', desc: '主进程与渲染进程通过安全的IPC通道通信' },
    { title: '开发者模式可控', desc: '可随时开启或关闭开发者工具访问权限' },
  ];

  const stats = [
    { label: '核心功能', value: '8', suffix: '个' },
    { label: '快捷工具', value: '12', suffix: '个' },
    { label: '主题样式', value: '13', suffix: '种' },
    { label: '技术组件', value: '8', suffix: '项' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full overflow-y-auto"
      style={{ margin: '-2rem', padding: '2rem' }}
    >
      <div className="min-h-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl p-10 mb-8 relative overflow-hidden group"
          style={{
            background: `linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-black/40" />
          <div className="absolute top-0 right-0 w-96 h-96 opacity-5 transition-transform duration-500 group-hover:scale-110">
            <Star size={384} className="text-white" />
          </div>
          <div className="absolute bottom-0 left-0 w-64 h-64 opacity-5 transition-transform duration-500 group-hover:scale-110">
            <Rocket size={256} className="text-white" />
          </div>
          <div
            className="relative z-10 cursor-pointer select-none"
            onDoubleClick={handleHeaderDoubleClick}
            title="双击打开开发者模式设置"
          >
            <div className="flex items-center gap-6 mb-6">
              <motion.div 
                className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/10"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Sparkles size={40} className="text-white" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">{appName}</h1>
                <p className="text-white/90 text-base drop-shadow">多功能智能桌面应用 v1.0.0</p>
              </div>
            </div>
            <p className="text-white/95 text-lg leading-relaxed max-w-3xl mb-6 drop-shadow">
              如同星辰之间的约定，连接用户与智能、创意与效率。
              一款集成了人工智能对话、媒体处理、数据管理等多种功能于一体的现代化桌面应用程序。
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {devToolsEnabled && (
                <motion.div 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-xl text-white text-sm border border-white/10"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Terminal size={14} />
                  开发者模式已启用
                </motion.div>
              )}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-xl text-white text-sm border border-white/10">
                <Shield size={14} />
                本地数据安全存储
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="rounded-2xl p-5 text-center cursor-pointer transition-all"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              whileHover={{ scale: 1.05, y: -5 }}
              onHoverStart={() => setActiveStats(stat.label)}
              onHoverEnd={() => setActiveStats(null)}
            >
              <motion.div 
                className="text-3xl font-bold mb-1"
                style={{ color: 'var(--primary-color)' }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1, type: 'spring' }}
              >
                {stat.value}<span className="text-lg">{stat.suffix}</span>
              </motion.div>
              <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-6 mb-8"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--primary-light)' }}>
              <Layers size={24} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>核心功能模块</h2>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>点击查看详情</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {mainFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="rounded-xl p-4 transition-all hover:scale-[1.02] group cursor-pointer relative overflow-hidden"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                onClick={() => setSelectedFeature(feature)}
                whileHover={{ y: -5 }}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon size={24} style={{ color: feature.color }} />
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{feature.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{feature.desc}</p>
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={16} style={{ color: 'var(--primary-color)' }} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl p-6 mb-8"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--primary-light)' }}>
              <Zap size={24} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>快捷工具</h2>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>快速访问常用功能</p>
            </div>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {quickTools.map((tool, index) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.03 }}
                className="rounded-xl p-4 flex flex-col items-center text-center transition-all group cursor-pointer"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${tool.color}15` }}
                >
                  <tool.icon size={22} style={{ color: tool.color }} />
                </div>
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{tool.title}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl p-6 mb-8"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--primary-light)' }}>
              <Code size={24} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>技术栈</h2>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>点击查看详细信息</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {techStack.map((tech, index) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="rounded-xl p-5 transition-all hover:scale-[1.02] group cursor-pointer relative overflow-hidden"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                onClick={() => setSelectedTech(tech)}
                whileHover={{ y: -5 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${tech.color}15` }}
                  >
                    <tech.icon size={22} style={{ color: tech.color }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tech.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>v{tech.version}</div>
                  </div>
                </div>
                <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {tech.desc}
                </div>
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Info size={14} style={{ color: 'var(--primary-color)' }} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
          <motion.div
            className="rounded-2xl p-6"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
            whileHover={{ y: -5 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--primary-light)' }}>
                <Palette size={20} style={{ color: 'var(--primary-color)' }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>主题系统</h2>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>悬停预览主题</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {themes.map((theme) => (
                <motion.div
                  key={theme.name}
                  className="aspect-square rounded-xl relative cursor-pointer"
                  style={{
                    backgroundColor: theme.color,
                    border: `2px solid ${hoveredTheme === theme.name ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    boxShadow: hoveredTheme === theme.name ? '0 4px 12px rgba(0,0,0,0.15)' : 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={() => setHoveredTheme(theme.name)}
                  onMouseLeave={() => setHoveredTheme(null)}
                  whileHover={{ scale: 1.15, zIndex: 10 }}
                  title={theme.name}
                >
                  <AnimatePresence>
                    {hoveredTheme === theme.name && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded text-[10px] font-medium z-20"
                        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      >
                        {theme.name}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="rounded-2xl p-6"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
            whileHover={{ y: -5 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--primary-light)' }}>
                <Shield size={20} style={{ color: 'var(--primary-color)' }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>安全特性</h2>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>保护您的隐私</p>
              </div>
            </div>
            <ul className="space-y-3">
              {securityFeatures.map((item, index) => (
                <motion.li 
                  key={item.title} 
                  className="flex items-start gap-3 text-sm p-3 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{ backgroundColor: 'var(--bg-primary)' }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'var(--success-color)15' }}>
                    <Check size={12} style={{ color: 'var(--success-color)' }} />
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            className="rounded-2xl p-6"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
            whileHover={{ y: -5 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--primary-light)' }}>
                <Database size={20} style={{ color: 'var(--primary-color)' }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>数据存储</h2>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>IndexedDB本地存储</p>
              </div>
            </div>
            <div className="space-y-2">
              {storageItems.map((item, index) => (
                <motion.div
                  key={item.label}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{ backgroundColor: 'var(--bg-primary)' }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <item.icon size={16} style={{ color: 'var(--primary-color)' }} />
                  <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{item.size}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <motion.div 
            className="flex items-center justify-center gap-3 px-6 py-5 rounded-2xl cursor-pointer"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
            whileHover={{ scale: 1.01 }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Heart size={24} style={{ color: 'var(--error-color)' }} />
            </motion.div>
            <div className="text-center">
              <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>感谢使用星约</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Copyright © 2025 Starpact Team · 让我们一起探索星辰大海</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedFeature && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedFeature(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl p-6 max-w-md w-full"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${selectedFeature.color}15` }}
                >
                  <selectedFeature.icon size={28} style={{ color: selectedFeature.color }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{selectedFeature.title}</h3>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{selectedFeature.desc}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                {selectedFeature.detail}
              </p>
              <button
                onClick={() => setSelectedFeature(null)}
                className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTech && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedTech(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl p-6 max-w-md w-full"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${selectedTech.color}15` }}
                >
                  <selectedTech.icon size={28} style={{ color: selectedTech.color }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{selectedTech.name}</h3>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>v{selectedTech.version}</p>
                </div>
              </div>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{selectedTech.desc}</p>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-tertiary)' }}>{selectedTech.detail}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedTech.features.map((feature) => (
                  <span 
                    key={feature}
                    className="px-3 py-1 rounded-full text-xs"
                    style={{ backgroundColor: `${selectedTech.color}15`, color: selectedTech.color }}
                  >
                    {feature}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setSelectedTech(null)}
                className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDevToolsDialog && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDevToolsDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl p-6 max-w-sm w-full"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                开发者模式设置
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                {devToolsEnabled
                  ? '开发者模式当前已启用。您可以选择禁用它，禁用后 F12 快捷键将无法打开开发者工具。'
                  : '您确定要启用开发者模式吗？启用后可以使用 F12 快捷键打开开发者工具。'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDevToolsDialog(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  取消
                </button>
                <button
                  onClick={devToolsEnabled ? handleDisableDevTools : handleEnableDevTools}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: devToolsEnabled ? 'var(--error-color)' : 'var(--primary-color)',
                    color: 'white'
                  }}
                >
                  {devToolsEnabled ? '禁用' : '启用'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
