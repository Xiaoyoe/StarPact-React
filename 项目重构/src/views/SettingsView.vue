<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useThemeStore, useWallpaperStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import type { ThemeType } from '@/types';
import { Palette, Monitor, Database, Info, Type, Bell, LogOut, MessageSquareQuote, LayoutGrid, Sparkles, Image, Upload, Trash2, X, Check, Code } from 'lucide-vue-next';

const themeStore = useThemeStore();
const wallpaperStore = useWallpaperStore();
const toast = useToast();

const activeTab = ref<'appearance' | 'wallpaper' | 'general' | 'data-management' | 'about'>('appearance');

const tabs = [
  { id: 'appearance' as const, label: '外观', icon: Palette },
  { id: 'wallpaper' as const, label: '壁纸', icon: Palette },
  { id: 'general' as const, label: '通用', icon: Monitor },
  { id: 'data-management' as const, label: '数据', icon: Database },
  { id: 'about' as const, label: '关于', icon: Info },
];

const themeCategories = {
  light: {
    name: 'Light 主题',
    desc: '明亮清爽风格',
    themes: [
      { id: 'light' as ThemeType, name: '浅色主题', desc: '经典明亮风格', colors: ['#FFFFFF', '#165DFF', '#F2F3F5'] },
      { id: 'tech-blue' as ThemeType, name: '科技蓝', desc: '专业科技风格', colors: ['#FFFFFF', '#0A49C1', '#F8FBFF'] },
      { id: 'eye-care' as ThemeType, name: '护眼绿', desc: '自然舒适风格', colors: ['#FCFFFE', '#2A9D8F', '#F2FAF8'] },
    ]
  },
  night: {
    name: 'Night 主题',
    desc: '深色护眼风格',
    themes: [
      { id: 'dark' as ThemeType, name: '深色主题', desc: '护眼暗色风格', colors: ['#17171A', '#3C7EFF', '#232324'] },
      { id: 'midnight-blue' as ThemeType, name: '午夜蓝', desc: '深邃科技风格', colors: ['#121212', '#589EFF', '#1E1E20'] },
      { id: 'forest-green' as ThemeType, name: '森林绿', desc: '自然清新风格', colors: ['#0F172A', '#22C55E', '#064E3B'] },
      { id: 'coral-orange' as ThemeType, name: '珊瑚橙', desc: '温暖活力风格', colors: ['#0F172A', '#F97316', '#7C2D12'] },
      { id: 'lavender-purple' as ThemeType, name: '薰衣草紫', desc: '优雅浪漫风格', colors: ['#0F172A', '#8B5CF6', '#312E81'] },
      { id: 'mint-cyan' as ThemeType, name: '薄荷青', desc: '凉爽清新风格', colors: ['#0F172A', '#06B6D4', '#0E7490'] },
      { id: 'caramel-brown' as ThemeType, name: '焦糖棕', desc: '温暖复古风格', colors: ['#0F172A', '#D97706', '#78350F'] },
      { id: 'sakura-pink' as ThemeType, name: '樱花粉', desc: '柔和甜美风格', colors: ['#0F172A', '#EC4899', '#7E1D40'] },
      { id: 'deep-sea-blue' as ThemeType, name: '深海蓝', desc: '深邃专业风格', colors: ['#0F172A', '#1E40AF', '#1E3A8A'] },
      { id: 'amber-gold' as ThemeType, name: '琥珀金', desc: '奢华温暖风格', colors: ['#0F172A', '#F59E0B', '#78350F'] },
    ]
  }
};

const appNameDisplay = ref<'chinese' | 'english'>('english');
const defaultPage = ref<'chat' | 'models' | 'settings' | 'compare' | 'ini-config' | 'gallery' | 'video-player' | 'prompt-templates' | 'media-tools'>('chat');
const dailyQuoteEnabled = ref(false);
const dailyQuoteInterval = ref<10 | 3600 | 86400>(10);
const chatNotificationEnabled = ref(false);
const closeConfirm = ref(true);
const galleryDefaultLayout = ref<'grid' | 'waterfall' | 'list'>('grid');
const splashScreenEnabled = ref(true);
const splashScreenType = ref<'full' | 'minimal' | 'fade'>('full');
const sendOnEnter = ref(true);

const QUOTE_INTERVAL_OPTIONS = [
  { value: 10 as const, label: '10 秒' },
  { value: 3600 as const, label: '1 小时' },
  { value: 86400 as const, label: '24 小时' },
];

const handleThemeChange = (theme: ThemeType) => {
  themeStore.setTheme(theme);
  toast.success('主题已切换');
};

const handleAppNameDisplayChange = (value: 'chinese' | 'english') => {
  appNameDisplay.value = value;
  toast.success('项目名称显示已更新');
};

const handleDefaultPageChange = (value: typeof defaultPage.value) => {
  defaultPage.value = value;
  toast.success('默认功能页已更新');
};

const handleGalleryLayoutChange = (value: 'grid' | 'waterfall' | 'list') => {
  galleryDefaultLayout.value = value;
  toast.success('图片管理默认布局已更新');
};

const handleSplashScreenTypeChange = (value: 'full' | 'minimal' | 'fade') => {
  splashScreenType.value = value;
  toast.success('启动动画样式已更新');
};

const handleDailyQuoteIntervalChange = (value: 10 | 3600 | 86400) => {
  dailyQuoteInterval.value = value;
  toast.success('切换间隔已更新');
};

const handleAddWallpaper = async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  
  input.onchange = async (e: any) => {
    const files = Array.from(e.target.files) as File[];
    if (files.length > 0) {
      let successCount = 0;
      let firstWallpaper: any = null;
      for (const file of files) {
        const wallpaper = await wallpaperStore.addBackground(file);
        if (wallpaper) {
          successCount++;
          if (!firstWallpaper) firstWallpaper = wallpaper;
        }
      }
      if (successCount > 0) {
        toast.success(`已添加 ${successCount} 张壁纸`);
        if (firstWallpaper && !wallpaperStore.hasWallpaper) {
          await wallpaperStore.selectBackground(firstWallpaper);
          toast.success('壁纸已应用');
        }
      } else {
        toast.error('添加壁纸失败');
      }
    }
  };
  
  input.click();
};

const handleDeleteBackground = async (id: string) => {
  await wallpaperStore.deleteBackground(id);
  toast.success('壁纸已删除');
};

const handleClearAllWallpapers = async () => {
  if (confirm('确定要清空所有壁纸吗？')) {
    await wallpaperStore.clearAllBackgrounds();
    toast.success('已清空所有壁纸');
  }
};

const handleClearWallpaper = async () => {
  await wallpaperStore.clearWallpaper();
  toast.success('已清除当前壁纸');
};

const handleWallpaperSelect = async (bg: any) => {
  await wallpaperStore.selectBackground(bg);
};

const handleWallpaperDoubleClick = async (bg: any) => {
  await wallpaperStore.applyBackground(bg);
  toast.success('壁纸已应用');
};

const handleDoubleClickToggle = async () => {
  await wallpaperStore.setDoubleClickToChange(!wallpaperStore.doubleClickToChange);
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

onMounted(async () => {
  await wallpaperStore.loadBackgrounds();
});
</script>

<template>
  <div class="settings-page">
    <div class="settings-content">
      <div v-if="activeTab === 'appearance'" class="tab-content">
        <div class="section">
          <h2 class="section-title">
            <Palette :size="16" class="inline-icon" />
            主题
          </h2>
          <p class="section-desc">选择界面主题风格，支持十三种预设主题</p>
          
          <div v-for="(category, categoryIndex) in themeCategories" :key="categoryIndex" class="theme-category">
            <div class="category-header">
              <div class="category-line"></div>
              <h3 class="category-name">{{ category.name }}</h3>
              <span class="category-desc">{{ category.desc }}</span>
            </div>
            <div class="theme-grid">
              <button
                v-for="theme in category.themes"
                :key="theme.id"
                class="theme-card"
                :class="{ active: themeStore.theme === theme.id }"
                @click="handleThemeChange(theme.id)"
              >
                <div class="theme-colors">
                  <div
                    v-for="(color, i) in theme.colors"
                    :key="i"
                    class="color-dot"
                    :style="{ backgroundColor: color }"
                  ></div>
                </div>
                <div class="theme-name">{{ theme.name }}</div>
                <div class="theme-desc">{{ theme.desc }}</div>
                <div v-if="themeStore.theme === theme.id" class="theme-active">
                  ✓ 当前使用
                </div>
              </button>
            </div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">
            <Monitor :size="16" class="inline-icon" />
            窗口大小
          </h2>
          <p class="section-desc">快速调整应用程序窗口大小</p>
          
          <div class="window-size-grid">
            <button
              v-for="size in [
                { width: 1000, height: 625, name: '紧凑', desc: '1000 × 625' },
                { width: 1200, height: 750, name: '标准', desc: '1200 × 750' },
                { width: 1400, height: 900, name: '大窗口', desc: '1400 × 900' },
              ]"
              :key="size.name"
              class="size-card"
            >
              <div class="size-icon">
                <Monitor :size="12" />
              </div>
              <div class="size-name">{{ size.name }}</div>
              <div class="size-desc">{{ size.desc }}</div>
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'wallpaper'" class="tab-content">
        <div class="wallpaper-section">
          <div class="wallpaper-preview">
            <div class="preview-header">
              <Monitor :size="14" class="inline-icon" />
              <span class="preview-title">当前壁纸预览</span>
            </div>
            <div class="preview-content">
              <template v-if="wallpaperStore.currentWallpaper">
                <img 
                  :src="wallpaperStore.currentWallpaper" 
                  class="preview-image"
                  alt="当前壁纸"
                />
                <div class="preview-info" v-if="wallpaperStore.previewWallpaperInfo">
                  <span class="info-name">{{ wallpaperStore.previewWallpaperInfo.name }}</span>
                  <span class="info-size" v-if="wallpaperStore.previewWallpaperInfo.size">
                    {{ formatFileSize(wallpaperStore.previewWallpaperInfo.size) }}
                  </span>
                </div>
              </template>
              <div v-else class="preview-placeholder">
                <Palette :size="32" />
                <span>未设置壁纸，使用默认背景</span>
              </div>
            </div>
          </div>
          <div class="wallpaper-list">
            <div class="list-header">
              <div class="list-header-top">
                <div class="flex items-center gap-2">
                  <LayoutGrid :size="16" class="text-primary" />
                  <h3>壁纸列表</h3>
                </div>
                <div class="list-actions">
                  <button @click="handleAddWallpaper" class="action-btn primary" title="添加壁纸">
                    <Upload :size="12" />
                  </button>
                  <button 
                    v-if="wallpaperStore.wallpaperCount > 0" 
                    @click="handleClearAllWallpapers" 
                    class="action-btn danger" 
                    title="清空所有壁纸"
                  >
                    <Trash2 :size="12" />
                  </button>
                </div>
              </div>
              <p>选择或上传壁纸，为界面添加个性化背景</p>
            </div>
            
            <div class="double-click-toggle">
              <span>双击切换</span>
              <button
                @click="handleDoubleClickToggle"
                class="toggle-button-small"
                :class="{ active: wallpaperStore.doubleClickToChange }"
              >
                <div class="toggle-slider-small" :class="{ active: wallpaperStore.doubleClickToChange }"></div>
              </button>
            </div>
            
            <button
              v-if="wallpaperStore.hasWallpaper"
              @click="handleClearWallpaper"
              class="clear-wallpaper-btn"
            >
              <Trash2 :size="12" />
              清除当前壁纸
            </button>
            
            <div class="wallpapers-container">
              <div class="wallpapers-header">
                <Image :size="14" class="text-primary" />
                <span>我的壁纸</span>
                <span class="wallpaper-count">{{ wallpaperStore.wallpaperCount }}</span>
              </div>
              
              <div class="wallpapers-list">
                <template v-if="wallpaperStore.wallpaperCount > 0">
                  <div
                    v-for="(bg, index) in wallpaperStore.customBackgrounds"
                    :key="bg.id"
                    class="wallpaper-item"
                    :class="{ active: wallpaperStore.selectedBackgroundId === bg.id }"
                    @click="handleWallpaperSelect(bg)"
                    @dblclick="handleWallpaperDoubleClick(bg)"
                  >
                    <span class="item-index">{{ index + 1 }}</span>
                    <div class="item-info">
                      <p class="item-name">{{ bg.name }}</p>
                    </div>
                    <span 
                      v-if="wallpaperStore.doubleClickToChange && wallpaperStore.selectedBackgroundId === bg.id && !bg.is_active" 
                      class="item-badge preview"
                    >
                      预览中
                    </span>
                    <span 
                      v-if="bg.is_active" 
                      class="item-badge using"
                    >
                      使用中
                    </span>
                    <button
                      @click.stop="handleDeleteBackground(bg.id)"
                      class="item-delete"
                    >
                      <X :size="10" />
                    </button>
                  </div>
                </template>
                <div v-else class="empty-wallpapers">
                  <Image :size="24" class="text-text-tertiary" />
                  <p>暂无自定义壁纸</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'general'" class="tab-content">
        <h2 class="section-title">通用设置</h2>

        <div class="setting-card">
          <div class="setting-header">
            <Type :size="16" class="setting-icon" />
            <div class="setting-title">项目名称显示</div>
          </div>
          <p class="setting-desc">设置项目名称在界面上的显示方式</p>
          <div class="setting-options">
            <button
              v-for="option in [
                { value: 'chinese' as const, label: '中文名称', desc: '星约' },
                { value: 'english' as const, label: '英文名称', desc: 'Starpact' }
              ]"
              :key="option.value"
              class="option-button"
              :class="{ active: appNameDisplay === option.value }"
              @click="handleAppNameDisplayChange(option.value)"
            >
              <div class="option-label">{{ option.label }}</div>
              <div class="option-desc">{{ option.desc }}</div>
            </button>
          </div>
        </div>

        <div class="setting-card">
          <div class="setting-header">
            <LayoutGrid :size="16" class="setting-icon" />
            <div class="setting-title">默认功能页</div>
          </div>
          <p class="setting-desc">设置每次启动程序时默认显示的功能页面</p>
          <div class="setting-options-grid">
            <button
              v-for="option in [
                { value: 'chat' as const, label: '聊天', desc: 'AI对话' },
                { value: 'models' as const, label: '模型', desc: '模型管理' },
                { value: 'gallery' as const, label: '图片', desc: '图片管理' },
                { value: 'video-player' as const, label: '视频', desc: '视频播放' },
                { value: 'prompt-templates' as const, label: '提示词', desc: '模板管理' },
                { value: 'compare' as const, label: '对比', desc: '文本对比' },
                { value: 'media-tools' as const, label: '媒体工具', desc: '音视频处理' },
                { value: 'ini-config' as const, label: '配置', desc: 'INI配置' },
                { value: 'settings' as const, label: '设置', desc: '系统设置' },
              ]"
              :key="option.value"
              class="option-button-small"
              :class="{ active: defaultPage === option.value }"
              @click="handleDefaultPageChange(option.value)"
            >
              <div class="option-label">{{ option.label }}</div>
              <div class="option-desc">{{ option.desc }}</div>
            </button>
          </div>
        </div>

        <div class="setting-card">
          <div class="setting-header">
            <MessageSquareQuote :size="16" class="setting-icon" />
            <div class="setting-title">每日一言</div>
          </div>
          <p class="setting-desc">在标题栏显示励志名言，定时切换</p>
          <div class="toggle-row">
            <button
              class="toggle-button"
              :class="{ active: dailyQuoteEnabled }"
              @click="dailyQuoteEnabled = !dailyQuoteEnabled"
            >
              <div class="toggle-slider" :class="{ active: dailyQuoteEnabled }"></div>
            </button>
          </div>
          <div v-if="dailyQuoteEnabled" class="interval-options">
            <span class="interval-label">切换间隔：</span>
            <div class="interval-buttons">
              <button
                v-for="option in QUOTE_INTERVAL_OPTIONS"
                :key="option.value"
                class="interval-button"
                :class="{ active: dailyQuoteInterval === option.value }"
                @click="handleDailyQuoteIntervalChange(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="setting-card">
          <div class="setting-header">
            <Bell :size="16" class="setting-icon" />
            <div class="setting-title">聊天桌面通知</div>
          </div>
          <p class="setting-desc">当 AI 回复完成时发送桌面通知提醒</p>
          <div class="toggle-row">
            <button
              class="toggle-button"
              :class="{ active: chatNotificationEnabled }"
              @click="chatNotificationEnabled = !chatNotificationEnabled"
            >
              <div class="toggle-slider" :class="{ active: chatNotificationEnabled }"></div>
            </button>
          </div>
        </div>

        <div class="setting-card">
          <div class="setting-header">
            <LogOut :size="16" class="setting-icon" />
            <div class="setting-title">关闭确认</div>
          </div>
          <p class="setting-desc">关闭应用程序时显示确认弹窗，防止误操作</p>
          <div class="toggle-row">
            <button
              class="toggle-button"
              :class="{ active: closeConfirm }"
              @click="closeConfirm = !closeConfirm"
            >
              <div class="toggle-slider" :class="{ active: closeConfirm }"></div>
            </button>
          </div>
        </div>

        <div class="setting-card">
          <div class="setting-header">
            <LayoutGrid :size="16" class="setting-icon" />
            <div class="setting-title">图片管理默认布局</div>
          </div>
          <p class="setting-desc">设置图片管理功能页面的默认显示布局</p>
          <div class="setting-options">
            <button
              v-for="option in [
                { value: 'grid' as const, label: '网格布局', desc: '整齐排列' },
                { value: 'waterfall' as const, label: '瀑布流', desc: '自适应高度' },
                { value: 'list' as const, label: '列表布局', desc: '详细信息' }
              ]"
              :key="option.value"
              class="option-button"
              :class="{ active: galleryDefaultLayout === option.value }"
              @click="handleGalleryLayoutChange(option.value)"
            >
              <div class="option-label">{{ option.label }}</div>
              <div class="option-desc">{{ option.desc }}</div>
            </button>
          </div>
        </div>

        <div class="setting-card">
          <div class="setting-header">
            <div class="setting-title">Enter 发送</div>
          </div>
          <p class="setting-desc">按 Enter 键直接发送消息</p>
          <div class="toggle-row">
            <button
              class="toggle-button"
              :class="{ active: sendOnEnter }"
              @click="sendOnEnter = !sendOnEnter"
            >
              <div class="toggle-slider" :class="{ active: sendOnEnter }"></div>
            </button>
          </div>
        </div>

        <div class="setting-card">
          <div class="setting-header">
            <Sparkles :size="16" class="setting-icon" />
            <div class="setting-title">启动动画</div>
          </div>
          <p class="setting-desc">程序启动时显示动画效果</p>
          <div class="toggle-row">
            <button
              class="toggle-button"
              :class="{ active: splashScreenEnabled }"
              @click="splashScreenEnabled = !splashScreenEnabled"
            >
              <div class="toggle-slider" :class="{ active: splashScreenEnabled }"></div>
            </button>
          </div>
          <div v-if="splashScreenEnabled" class="splash-options">
            <p class="splash-label">选择动画样式：</p>
            <div class="setting-options-grid">
              <button
                v-for="option in [
                  { value: 'full' as const, label: '完整动画', desc: '精美启动画面' },
                  { value: 'minimal' as const, label: '简约动画', desc: '加载指示器' },
                  { value: 'fade' as const, label: '淡入淡出', desc: '简单过渡' }
                ]"
                :key="option.value"
                class="option-button-small"
                :class="{ active: splashScreenType === option.value }"
                @click="handleSplashScreenTypeChange(option.value)"
              >
                <div class="option-label">{{ option.label }}</div>
                <div class="option-desc">{{ option.desc }}</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'data-management'" class="tab-content">
        <div class="section">
          <div class="section-header">
            <Database :size="16" class="inline-icon" />
            <h3 class="section-title">存储状态</h3>
          </div>
          <div class="storage-status">
            <div class="status-card">
              <div class="status-icon">
                <Database :size="24" />
              </div>
              <div class="status-info">
                <div class="status-label">SQLite 数据库</div>
                <div class="status-value">starpact.db</div>
              </div>
            </div>
          </div>
          <div class="security-tip">
            <div class="tip-header">
              <span class="tip-icon">🔒</span>
              <span class="tip-title">安全提示</span>
            </div>
            <p class="tip-content">
              SQLite 数据仅存储在本地程序目录中，不会上传至任何远程服务器。
              建议定期导出备份以防止数据丢失。
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'about'" class="tab-content about-content">
        <div class="about-header">
          <div class="about-icon">
            <Sparkles :size="40" />
          </div>
          <div class="about-info">
            <h1 class="about-title">{{ appNameDisplay === 'chinese' ? '星约' : 'Starpact' }}</h1>
            <p class="about-subtitle">多功能智能桌面应用 v1.0.0</p>
          </div>
        </div>
        <p class="about-description">
          如同星辰之间的约定，连接用户与智能、创意与效率。
          一款集成了人工智能对话、媒体处理、数据管理等多种功能于一体的现代化桌面应用程序。
        </p>
        <div class="about-badges">
          <div class="badge">
            <span class="badge-icon">🔒</span>
            本地数据安全存储
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">8<span class="stat-suffix">个</span></div>
            <div class="stat-label">核心功能</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">13<span class="stat-suffix">种</span></div>
            <div class="stat-label">主题样式</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">4<span class="stat-suffix">项</span></div>
            <div class="stat-label">技术组件</div>
          </div>
        </div>

        <div class="tech-section">
          <div class="section-header">
            <div class="section-icon">
              <Monitor :size="24" />
            </div>
            <div>
              <h2 class="section-title">技术栈</h2>
              <p class="section-subtitle">点击查看详细信息</p>
            </div>
          </div>
          <div class="tech-grid">
            <div
              v-for="tech in [
                { name: 'Tauri', version: '2.5.1', color: '#24C8D8', desc: '跨平台桌面应用框架' },
                { name: 'Vue 3', version: '3.5.13', color: '#42B883', desc: '渐进式JavaScript框架' },
                { name: 'TypeScript', version: '5.9.3', color: '#3178C6', desc: 'JavaScript的超集' },
                { name: 'Rust', version: '1.83.0', color: '#DEA584', desc: '系统编程语言' },
              ]"
              :key="tech.name"
              class="tech-card"
            >
              <div class="tech-icon" :style="{ backgroundColor: `${tech.color}15` }">
                <Code :size="22" :style="{ color: tech.color }" />
              </div>
              <div class="tech-info">
                <div class="tech-name">{{ tech.name }}</div>
                <div class="tech-version">v{{ tech.version }}</div>
              </div>
              <div class="tech-desc">{{ tech.desc }}</div>
            </div>
          </div>
        </div>

        <div class="footer-section">
          <div class="footer-content">
            <span class="heart">❤️</span>
            <div class="footer-text">
              <p class="footer-title">感谢使用星约</p>
              <p class="footer-subtitle">Copyright © 2025 Starpact Team · 让我们一起探索星辰大海</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-tabs">
      <nav class="tabs-nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-button"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" :size="16" />
          {{ tab.label }}
        </button>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

.tab-content {
  max-width: 800px;
  margin: 0 auto;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-desc {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}

.inline-icon {
  color: var(--primary-color);
}

.theme-category {
  margin-bottom: 24px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.category-line {
  width: 32px;
  height: 4px;
  background-color: var(--primary-color);
  border-radius: 2px;
}

.category-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.category-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.theme-card {
  padding: 16px;
  border-radius: 12px;
  border: 2px solid var(--border-color);
  background-color: var(--bg-secondary);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-card:hover {
  transform: scale(1.02);
}

.theme-card.active {
  border-color: var(--primary-color);
}

.theme-colors {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.color-dot {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.theme-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.theme-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.theme-active {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--primary-color);
}

.window-size-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.size-card {
  padding: 16px;
  border-radius: 12px;
  border: 2px solid var(--border-color);
  background-color: var(--bg-secondary);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.size-card:hover {
  transform: scale(1.02);
}

.size-icon {
  width: 32px;
  height: 24px;
  background-color: var(--bg-tertiary);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  color: var(--text-tertiary);
}

.size-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.size-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.wallpaper-section {
  display: flex;
  gap: 16px;
  height: calc(100vh - 200px);
}

.wallpaper-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  color: var(--primary-color);
}

.preview-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-tertiary);
  position: relative;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview-info {
  position: absolute;
  bottom: 16px;
  left: 16px;
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 8px;
  backdrop-filter: blur(8px);
}

.info-name {
  font-size: 12px;
  color: white;
}

.info-size {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-tertiary);
}

.wallpaper-list {
  width: 300px;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.list-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.list-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.list-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.list-header p {
  font-size: 12px;
  color: var(--text-tertiary);
}

.list-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  padding: 6px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn.primary {
  background-color: var(--primary-color);
  color: white;
}

.action-btn.primary:hover {
  opacity: 0.9;
}

.action-btn.danger {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.action-btn.danger:hover {
  background-color: rgba(239, 68, 68, 0.2);
}

.double-click-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
}

.double-click-toggle span {
  font-size: 12px;
  color: var(--text-tertiary);
}

.toggle-button-small {
  position: relative;
  width: 28px;
  height: 16px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-button-small.active {
  background-color: var(--primary-color);
}

.toggle-slider-small {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.toggle-slider-small.active {
  left: 14px;
}

.clear-wallpaper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 8px 16px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.clear-wallpaper-btn:hover {
  background-color: rgba(239, 68, 68, 0.2);
}

.wallpapers-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wallpapers-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--bg-tertiary);
}

.wallpapers-header span {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.wallpaper-count {
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 10px;
  background-color: var(--primary-light);
  color: var(--primary-color);
  font-size: 10px;
}

.wallpapers-list {
  flex: 1;
  overflow-y: auto;
}

.wallpaper-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  border-left: 3px solid transparent;
}

.wallpaper-item:hover {
  background-color: var(--bg-tertiary);
}

.wallpaper-item.active {
  background-color: var(--primary-light);
  border-left-color: var(--primary-color);
}

.item-index {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 500;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.wallpaper-item.active .item-index {
  background-color: var(--primary-color);
  color: white;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wallpaper-item.active .item-name {
  color: var(--primary-color);
}

.item-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

.item-badge.preview {
  background-color: rgba(59, 130, 246, 0.15);
  color: var(--primary-color);
}

.item-badge.using {
  background-color: var(--primary-color);
  color: white;
}

.item-delete {
  padding: 4px;
  border-radius: 4px;
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
}

.wallpaper-item:hover .item-delete {
  opacity: 1;
}

.item-delete:hover {
  background-color: rgba(239, 68, 68, 0.2);
}

.empty-wallpapers {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: var(--text-tertiary);
}

.empty-wallpapers p {
  font-size: 10px;
  margin-top: 8px;
}

.setting-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.setting-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.setting-icon {
  color: var(--primary-color);
}

.setting-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.setting-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 12px;
}

.setting-options {
  display: flex;
  gap: 8px;
}

.option-button {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-button:hover {
  transform: scale(1.05);
}

.option-button.active {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.option-label {
  font-weight: 500;
}

.option-desc {
  font-size: 10px;
  opacity: 0.7;
  margin-top: 2px;
}

.setting-options-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.option-button-small {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-button-small:hover {
  transform: scale(1.05);
}

.option-button-small.active {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.toggle-row {
  display: flex;
  justify-content: flex-end;
}

.toggle-button {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background-color: var(--bg-tertiary);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-button.active {
  background-color: var(--primary-color);
}

.toggle-button:hover {
  transform: scale(1.05);
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.toggle-slider.active {
  left: 22px;
}

.interval-options {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.interval-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.interval-buttons {
  display: flex;
  gap: 4px;
}

.interval-button {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.interval-button:hover {
  transform: scale(1.05);
}

.interval-button.active {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.splash-options {
  margin-top: 12px;
}

.splash-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.storage-status {
  margin-bottom: 16px;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.status-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background-color: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}

.status-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.status-value {
  font-size: 12px;
  color: var(--text-tertiary);
}

.security-tip {
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
}

.tip-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.tip-icon {
  font-size: 12px;
}

.tip-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.tip-content {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.about-content {
  max-width: 100%;
  margin: -32px;
  padding: 32px;
}

.about-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 40px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  border-radius: 24px;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;
}

.about-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom right, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4));
}

.about-icon {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  background-color: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  position: relative;
  z-index: 1;
}

.about-info {
  position: relative;
  z-index: 1;
}

.about-title {
  font-size: 36px;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
}

.about-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
}

.about-description {
  font-size: 16px;
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: 24px;
  max-width: 800px;
}

.about-badges {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  font-size: 14px;
  color: var(--text-primary);
}

.badge-icon {
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  padding: 20px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 4px;
}

.stat-suffix {
  font-size: 18px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-tertiary);
}

.tech-section {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
}

.tech-section .section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.tech-section .section-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background-color: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}

.tech-section .section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.tech-section .section-subtitle {
  font-size: 14px;
  color: var(--text-tertiary);
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.tech-card {
  padding: 20px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tech-card:hover {
  transform: translateY(-4px);
}

.tech-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.tech-info {
  margin-bottom: 8px;
}

.tech-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.tech-version {
  font-size: 12px;
  color: var(--text-tertiary);
}

.tech-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.footer-section {
  margin-top: 32px;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 16px;
}

.heart {
  font-size: 24px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.footer-text {
  text-align: center;
}

.footer-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.footer-subtitle {
  font-size: 14px;
  color: var(--text-tertiary);
}

.settings-tabs {
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  padding: 8px;
}

.tabs-nav {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 24px;
  border-radius: 8px;
  border: none;
  background-color: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-button:hover {
  transform: scale(1.05);
}

.tab-button.active {
  background-color: var(--primary-light);
  color: var(--primary-color);
  font-weight: 600;
}
</style>
