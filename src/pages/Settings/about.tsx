import { motion } from 'framer-motion';

/**
 * 关于页面组件
 */
export function AboutSection() {
  return (
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
          {
            [
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
            ))
          }
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
  );
}
