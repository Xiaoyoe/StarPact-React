import { useState } from 'react';
import {
  Palette, Type, Layout, Monitor, Info, RefreshCw, Download, Upload, Shield
} from 'lucide-react';
import { useStore } from '@/store';
import type { ThemeType } from '@/store';
import { motion } from 'framer-motion';

export function SettingsPage() {
  const {
    theme, setTheme,
    fontSize, setFontSize,
    layoutMode, setLayoutMode,
    sendOnEnter, setSendOnEnter,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'appearance' | 'general' | 'about'>('appearance');

  const themeCategories = {
    light: {
      name: 'Light 主题',
      desc: '明亮清爽风格',
      themes: [
        { id: 'light', name: '浅色主题', desc: '经典明亮风格', colors: ['#FFFFFF', '#165DFF', '#F2F3F5'] },
        { id: 'tech-blue', name: '科技蓝', desc: '专业科技风格', colors: ['#FFFFFF', '#0A49C1', '#F8FBFF'] },
        { id: 'eye-care', name: '护眼绿', desc: '自然舒适风格', colors: ['#FCFFFE', '#2A9D8F', '#F2FAF8'] },
      ]
    },
    night: {
      name: 'Night 主题',
      desc: '深色护眼风格',
      themes: [
        { id: 'dark', name: '深色主题', desc: '护眼暗色风格', colors: ['#17171A', '#3C7EFF', '#232324'] },
        { id: 'midnight-blue', name: '午夜蓝', desc: '深邃科技风格', colors: ['#121212', '#589EFF', '#1E1E20'] },
        { id: 'forest-green', name: '森林绿', desc: '自然清新风格', colors: ['#0F172A', '#22C55E', '#064E3B'] },
        { id: 'coral-orange', name: '珊瑚橙', desc: '温暖活力风格', colors: ['#0F172A', '#F97316', '#7C2D12'] },
        { id: 'lavender-purple', name: '薰衣草紫', desc: '优雅浪漫风格', colors: ['#0F172A', '#8B5CF6', '#312E81'] },
        { id: 'mint-cyan', name: '薄荷青', desc: '凉爽清新风格', colors: ['#0F172A', '#06B6D4', '#0E7490'] },
        { id: 'caramel-brown', name: '焦糖棕', desc: '温暖复古风格', colors: ['#0F172A', '#D97706', '#78350F'] },
        { id: 'sakura-pink', name: '樱花粉', desc: '柔和甜美风格', colors: ['#0F172A', '#EC4899', '#7E1D40'] },
        { id: 'deep-sea-blue', name: '深海蓝', desc: '深邃专业风格', colors: ['#0F172A', '#1E40AF', '#1E3A8A'] },
        { id: 'amber-gold', name: '琥珀金', desc: '奢华温暖风格', colors: ['#0F172A', '#F59E0B', '#78350F'] },
      ]
    }
  };

  const tabs = [
    { id: 'appearance' as const, label: '外观', icon: Palette },
    { id: 'general' as const, label: '通用', icon: Layout },
    { id: 'about' as const, label: '关于', icon: Info },
  ];

  return (
    <div className="flex h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Left Tabs */}
      <div className="w-56 border-r p-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <h1 className="mb-4 px-3 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          设置
        </h1>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--primary-light)' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? 600 : 400,
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl">
          {activeTab === 'appearance' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Theme Selection */}
              <section>
                <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <Palette size={16} className="mr-2 inline" />
                  主题
                </h2>
                <p className="mb-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  选择界面主题风格，支持十三种预设主题
                </p>
                {Object.values(themeCategories).map((category, categoryIndex) => (
                  <div key={categoryIndex} className="mb-6">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-1 w-8 rounded-full" style={{ backgroundColor: 'var(--primary-color)' }} />
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{category.name}</h3>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{category.desc}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {category.themes.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className="rounded-xl p-4 text-left transition-all active:scale-[0.98]"
                          style={{
                            border: `2px solid ${theme === t.id ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            backgroundColor: 'var(--bg-secondary)',
                          }}
                        >
                          <div className="mb-3 flex gap-1.5">
                            {t.colors.map((c, i) => (
                              <div
                                key={i}
                                className="h-6 w-6 rounded-md border border-black/5"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {t.name}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {t.desc}
                          </div>
                          {theme === t.id && (
                            <div className="mt-2 text-xs font-medium" style={{ color: 'var(--primary-color)' }}>
                              ✓ 当前使用
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              {/* Font Size */}
              <section>
                <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <Type size={16} className="mr-2 inline" />
                  字体大小
                </h2>
                <p className="mb-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  调整界面字体大小
                </p>
                <div className="flex items-center gap-4">
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>小</span>
                  <input
                    type="range"
                    min="12"
                    max="18"
                    step="1"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="flex-1 accent-[var(--primary-color)]"
                  />
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>大</span>
                  <span
                    className="w-12 text-center text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {fontSize}px
                  </span>
                </div>
                <div
                  className="mt-3 rounded-lg p-3"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    fontSize: `${fontSize}px`,
                    color: 'var(--text-primary)',
                  }}
                >
                  预览文本：这是一段示例文字，用于预览字体大小效果。
                </div>
              </section>

              {/* Layout */}
              <section>
                <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <Monitor size={16} className="mr-2 inline" />
                  布局模式
                </h2>
                <p className="mb-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  选择适合屏幕尺寸的布局
                </p>
                <div className="flex gap-3">
                  {[
                    { id: 'compact' as const, name: '紧凑', desc: '适合小屏幕' },
                    { id: 'comfortable' as const, name: '舒适', desc: '默认推荐' },
                    { id: 'wide' as const, name: '宽屏', desc: '适合大屏幕' },
                  ].map(l => (
                    <button
                      key={l.id}
                      onClick={() => setLayoutMode(l.id)}
                      className="flex-1 rounded-xl p-4 text-center transition-all active:scale-[0.98]"
                      style={{
                        border: `2px solid ${layoutMode === l.id ? 'var(--primary-color)' : 'var(--border-color)'}`,
                        backgroundColor: 'var(--bg-secondary)',
                      }}
                    >
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{l.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{l.desc}</div>
                    </button>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'general' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                通用设置
              </h2>

              {/* Send on Enter */}
              <div
                className="flex items-center justify-between rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Enter 发送</div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>按 Enter 键直接发送消息</div>
                </div>
                <button
                  onClick={() => setSendOnEnter(!sendOnEnter)}
                  className="relative h-6 w-11 rounded-full transition-colors"
                  style={{ backgroundColor: sendOnEnter ? 'var(--primary-color)' : 'var(--bg-tertiary)' }}
                >
                  <motion.div
                    animate={{ x: sendOnEnter ? 22 : 2 }}
                    className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
                  />
                </button>
              </div>

              {/* Data Management */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <h3 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  数据管理
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                  >
                    <Download size={14} /> 导出配置
                  </button>
                  <button
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                  >
                    <Upload size={14} /> 导入配置
                  </button>
                  <button
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                  >
                    <RefreshCw size={14} /> 恢复默认
                  </button>
                </div>
              </div>

              {/* Security */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <h3 className="mb-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  <Shield size={14} className="mr-1 inline" /> 安全
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  所有 API Key 均使用 AES-256 加密存储在本地设备，不会上传至任何远程服务器。
                  对话记录仅保存在本地 SQLite 数据库中。
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: 'var(--primary-light)' }}
                >
                  <span className="text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>AI</span>
                </div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  AI Model WebUI
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  智能模型交互平台 v1.0.0
                </p>
              </div>

              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>技术栈</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'React 18 + TypeScript',
                    'Tailwind CSS 4.x',
                    'Zustand 状态管理',
                    'Framer Motion 动效',
                    'React Markdown',
                    'Lucide Icons',
                  ].map((tech) => (
                    <div key={tech} className="rounded-lg p-2 text-sm" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)' }}>
                      {tech}
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>核心特性</h3>
                <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li>✦ 多主题支持（浅色/深色/科技蓝/护眼绿/午夜蓝/森林绿/珊瑚橙/薰衣草紫/薄荷青/焦糖棕/樱花粉/深海蓝/琥珀金）</li>
                  <li>✦ 多模型管理与快速切换</li>
                  <li>✦ 流式输出打字机效果</li>
                  <li>✦ Markdown 全格式渲染 + 代码高亮</li>
                  <li>✦ 通用工具类封装，一次开发全局复用</li>
                  <li>✦ 跨平台桌面端适配</li>
                </ul>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
