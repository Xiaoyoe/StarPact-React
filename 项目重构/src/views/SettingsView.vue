<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useThemeStore, useWallpaperStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import type { ThemeType } from '@/types';
import { Palette, Monitor, Database, Info, Type, Bell, LogOut, MessageSquareQuote, LayoutGrid, Sparkles, Image, Upload, Trash2, X, Check, Code, FolderOpen, Download, File, Folder, ChevronRight, ChevronDown, RefreshCw } from 'lucide-vue-next';
import { invoke } from '@tauri-apps/api/core';
import { confirm } from '@tauri-apps/plugin-dialog';

const themeStore = useThemeStore();
const wallpaperStore = useWallpaperStore();
const toast = useToast();

const activeTab = ref<'appearance' | 'wallpaper' | 'general' | 'data-management' | 'about'>('appearance');
const isResetting = ref(false);

interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  children?: FileNode[];
  expanded?: boolean;
}

const folderStructure = ref<FileNode[]>([]);
const isLoadingFolder = ref(false);
const expandedFolders = ref<Set<string>>(new Set());

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
const splashScreenUseWallpaper = ref(true);
const sendOnEnter = ref(true);
const lanTransferMode = ref<'streaming' | 'buffered'>('streaming');

const QUOTE_INTERVAL_OPTIONS = [
  { value: 10 as const, label: '10 秒' },
  { value: 3600 as const, label: '1 小时' },
  { value: 86400 as const, label: '24 小时' },
];

const handleThemeChange = (theme: ThemeType) => {
  themeStore.setTheme(theme);
  toast.success('主题已切换');
};

const handleAppNameDisplayChange = async (value: 'chinese' | 'english') => {
  appNameDisplay.value = value;
  await saveSettings('app_name_display', value);
  toast.success('项目名称显示已更新');
};

const handleDefaultPageChange = async (value: typeof defaultPage.value) => {
  defaultPage.value = value;
  await saveSettings('default_page', value);
  toast.success('默认功能页已更新');
};

const handleGalleryLayoutChange = async (value: 'grid' | 'waterfall' | 'list') => {
  galleryDefaultLayout.value = value;
  await saveSettings('gallery_default_layout', value);
  toast.success('图片管理默认布局已更新');
};

const handleSplashScreenTypeChange = async (value: 'full' | 'minimal' | 'fade') => {
  splashScreenType.value = value;
  await saveSettings('splash_screen_type', value);
  toast.success('启动动画样式已更新');
};

watch(splashScreenEnabled, async (newValue) => {
  await saveSettings('splash_screen_enabled', newValue);
  toast.success(newValue ? '启动动画已启用' : '启动动画已禁用');
});

watch(splashScreenUseWallpaper, async (newValue) => {
  await saveSettings('splash_screen_use_wallpaper', newValue);
  toast.success(newValue ? '启动动画将使用壁纸背景' : '启动动画将使用默认背景');
});

watch(dailyQuoteEnabled, async (newValue) => {
  await saveSettings('daily_quote_enabled', newValue);
  toast.success(newValue ? '每日一言已启用' : '每日一言已禁用');
});

watch(chatNotificationEnabled, async (newValue) => {
  await saveSettings('chat_notification_enabled', newValue);
  toast.success(newValue ? '聊天通知已启用' : '聊天通知已禁用');
});

watch(closeConfirm, async (newValue) => {
  await saveSettings('close_confirm', newValue);
  toast.success(newValue ? '关闭确认已启用' : '关闭确认已禁用');
});

watch(sendOnEnter, async (newValue) => {
  await saveSettings('send_on_enter', newValue);
  toast.success(newValue ? 'Enter发送已启用' : 'Enter发送已禁用');
});

const handleLanTransferModeChange = async (value: 'streaming' | 'buffered') => {
  lanTransferMode.value = value;
  await saveSettings('lan_transfer_mode', value);
  toast.success(value === 'streaming' ? '局域网传输已切换为流式模式' : '局域网传输已切换为缓冲模式');
};

const handleDailyQuoteIntervalChange = async (value: 10 | 3600 | 86400) => {
  dailyQuoteInterval.value = value;
  await saveSettings('daily_quote_interval', value);
  toast.success('切换间隔已更新');
};

const handleAddWallpaper = async () => {
  const wallpaper = await wallpaperStore.addWallpaperFromFile();
  if (wallpaper) {
    toast.success(`已添加壁纸: ${wallpaper.name}`);
    if (!wallpaperStore.hasWallpaper) {
      wallpaperStore.selectWallpaper(wallpaper);
      toast.success('壁纸已应用');
    }
  }
};

const handleDeleteBackground = async (id: string) => {
  await wallpaperStore.deleteWallpaper(id);
  toast.success('壁纸已删除');
};

const handleClearAllWallpapers = async () => {
  if (confirm('确定要清空所有壁纸吗？')) {
    await wallpaperStore.clearAllWallpapers();
    toast.success('已清空所有壁纸');
  }
};

const handleClearWallpaper = async () => {
  await wallpaperStore.clearWallpaper();
  toast.success('已清除当前壁纸');
};

const handleWallpaperSelect = (bg: any) => {
  wallpaperStore.selectWallpaper(bg);
};

const handleWallpaperDoubleClick = (bg: any) => {
  wallpaperStore.applyWallpaper(bg);
  toast.success('壁纸已应用');
};

const getCurrentWallpaperOrientation = computed(() => {
  const currentId = wallpaperStore.currentWallpaperId;
  if (!currentId) return 'landscape';
  const wallpaper = wallpaperStore.getWallpaperById(currentId);
  return wallpaper?.orientation || 'landscape';
});

const getPreviewWallpaperOrientation = computed(() => {
  const selectedId = wallpaperStore.selectedWallpaperId;
  if (!selectedId) return null;
  const wallpaper = wallpaperStore.getWallpaperById(selectedId);
  return wallpaper?.orientation || null;
});

const handleDoubleClickToggle = async () => {
  await wallpaperStore.setDoubleClickToChange(!wallpaperStore.doubleClickToChange);
};

const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === null) return '0 B';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const handleResetToFactory = async () => {
  const confirmed = await confirm(
    '此操作将清空所有数据，包括：\n' +
    '• 所有对话记录和模型配置\n' +
    '• 所有图片、视频、壁纸等媒体文件\n' +
    '• 所有缓存和临时文件\n' +
    '• 所有自定义设置和配置\n\n' +
    '此操作不可撤销！',
    {
      title: '确定要恢复出厂设置吗？',
      kind: 'warning',
    }
  );
  
  if (!confirmed) return;
  
  const doubleConfirmed = await confirm(
    '您真的要清空所有数据吗？\n' +
    '此操作将永久删除所有数据，无法恢复！',
    {
      title: '⚠️ 最后确认 ⚠️',
      kind: 'warning',
    }
  );
  
  if (!doubleConfirmed) return;
  
  isResetting.value = true;
  
  try {
    await invoke('storage_reset_to_factory');
    toast.success('已成功恢复出厂设置，应用将重新加载');
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error('Failed to reset to factory:', error);
    toast.error('恢复出厂设置失败：' + String(error));
  } finally {
    isResetting.value = false;
  }
};

const loadFolderStructure = async () => {
  isLoadingFolder.value = true;
  try {
    const structure = await invoke<FileNode[]>('get_data_folder_structure');
    folderStructure.value = structure;
  } catch (error) {
    console.error('Failed to load folder structure:', error);
    toast.error('加载文件夹结构失败');
  } finally {
    isLoadingFolder.value = false;
  }
};

const toggleFolder = (path: string) => {
  if (expandedFolders.value.has(path)) {
    expandedFolders.value.delete(path);
  } else {
    expandedFolders.value.add(path);
  }
  expandedFolders.value = new Set(expandedFolders.value);
};

const handleExportData = async () => {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const filePath = await save({
      defaultPath: `starpact-backup-${new Date().toISOString().split('T')[0]}`,
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
    });
    
    if (filePath) {
      toast.info('正在导出数据...');
      await invoke('export_data', { outputPath: filePath });
      toast.success('数据导出成功！');
    }
  } catch (error) {
    console.error('Failed to export data:', error);
    toast.error('导出失败：' + String(error));
  }
};

const handleImportData = async () => {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      multiple: false,
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
    });
    
    if (selected) {
      const filePath = typeof selected === 'string' ? selected : (selected as any).path;
      
      const confirmed = await confirm(
        '导入数据将覆盖当前的所有数据，包括：\n' +
        '• 对话记录和模型配置\n' +
        '• 图片、视频、壁纸等媒体文件\n' +
        '• 缓存和临时文件\n' +
        '• 自定义设置和配置\n\n' +
        '此操作不可撤销！',
        {
          title: '确认导入数据？',
          kind: 'warning',
        }
      );
      
      if (confirmed) {
        toast.info('正在导入数据...');
        await invoke('import_data', { inputPath: filePath });
        toast.success('数据导入成功！应用将重新加载');
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    }
  } catch (error) {
    console.error('Failed to import data:', error);
    toast.error('导入失败：' + String(error));
  }
};

const handleOpenDataFolder = async () => {
  try {
    await invoke('open_data_folder');
    toast.success('已打开数据文件夹');
  } catch (error) {
    console.error('Failed to open data folder:', error);
    toast.error('打开文件夹失败：' + String(error));
  }
};

const getFolderDescription = (name: string): string => {
  const descriptions: Record<string, string> = {
    'images': '存储图片文件',
    'videos': '存储视频文件',
    'wallpapers': '存储壁纸文件',
    'cache': '临时缓存文件',
    'exports': '导出文件目录',
    'backups': '备份文件目录',
    'starpact.db': 'SQLite数据库文件',
    'config.json': '应用配置文件',
    'thumbnails': '图片缩略图',
    'ini': 'INI配置导出',
    'prompts': '提示词模板导出',
  };
  return descriptions[name] || '';
};

const calculateFolderSize = (node: FileNode): number => {
  if (node.size !== undefined && node.size !== null) {
    return node.size;
  }
  if (node.children) {
    return node.children.reduce((total, child) => total + calculateFolderSize(child), 0);
  }
  return 0;
};

const loadSettings = async () => {
  try {
    const config = await invoke<any>('storage_get_config');
    
    if (config.ui) {
      if (config.ui.app_name_display) {
        appNameDisplay.value = config.ui.app_name_display;
      }
      if (config.ui.default_page) {
        defaultPage.value = config.ui.default_page;
      }
      if (config.ui.gallery_default_layout) {
        galleryDefaultLayout.value = config.ui.gallery_default_layout;
      }
      if (config.ui.daily_quote_enabled !== undefined) {
        dailyQuoteEnabled.value = config.ui.daily_quote_enabled;
      }
      if (config.ui.daily_quote_interval !== undefined) {
        dailyQuoteInterval.value = config.ui.daily_quote_interval as 10 | 3600 | 86400;
      }
      if (config.ui.chat_notification_enabled !== undefined) {
        chatNotificationEnabled.value = config.ui.chat_notification_enabled;
      }
      if (config.ui.close_confirm !== undefined) {
        closeConfirm.value = config.ui.close_confirm;
      }
      if (config.ui.send_on_enter !== undefined) {
        sendOnEnter.value = config.ui.send_on_enter;
      }
      if (config.ui.splash_screen_enabled !== undefined) {
        splashScreenEnabled.value = config.ui.splash_screen_enabled;
      }
      if (config.ui.splash_screen_type) {
        splashScreenType.value = config.ui.splash_screen_type;
      }
      if (config.ui.splash_screen_use_wallpaper !== undefined) {
        splashScreenUseWallpaper.value = config.ui.splash_screen_use_wallpaper;
      }
      if (config.ui.lan_transfer_mode) {
        lanTransferMode.value = config.ui.lan_transfer_mode as 'streaming' | 'buffered';
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
};

const saveSettings = async (key: string, value: any) => {
  try {
    const updates: any = {
      ui: {}
    };
    updates.ui[key] = value;
    
    await invoke('storage_update_config', { updates });
  } catch (error) {
    console.error('Failed to save settings:', error);
    toast.error('保存设置失败');
  }
};

onMounted(async () => {
  await wallpaperStore.loadBackgrounds();
  await loadSettings();
  await loadFolderStructure();
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

      <div v-else-if="activeTab === 'wallpaper'" class="tab-content wallpaper-tab">
        <!-- 两栏布局容器 -->
        <div class="wp-two-column-layout">
          <!-- 左栏：壁纸预览 -->
          <div class="wp-left-column">
            <div class="wp-preview-card">
              <div class="wp-preview-header">
                <div class="wp-preview-title-group">
                  <Monitor :size="18" class="inline-icon" />
                  <span class="wp-preview-title">当前壁纸</span>
                  <span v-if="wallpaperStore.currentWallpaper" class="wp-badge using">使用中</span>
                  <span v-else class="wp-badge none">未设置</span>
                </div>
              </div>
              <div class="wp-preview-body">
                <template v-if="wallpaperStore.doubleClickToChange && wallpaperStore.previewWallpaper">
                  <img 
                    :src="wallpaperStore.previewWallpaper" 
                    class="wp-preview-img" 
                    :class="{
                      'wp-portrait': getPreviewWallpaperOrientation === 'portrait',
                      'wp-landscape': getPreviewWallpaperOrientation === 'landscape'
                    }"
                    alt="预览壁纸" 
                  />
                  <div v-if="getPreviewWallpaperOrientation === 'portrait'" class="wp-portrait-bg">
                    <img :src="wallpaperStore.previewWallpaper" class="wp-portrait-bg-img" alt="背景" />
                  </div>
                  <div class="wp-preview-overlay">
                    <span class="wp-preview-hint">预览模式 - 双击应用</span>
                  </div>
                </template>
                <template v-else-if="wallpaperStore.currentWallpaper">
                  <img 
                    :src="wallpaperStore.currentWallpaper" 
                    class="wp-preview-img" 
                    :class="{
                      'wp-portrait': getCurrentWallpaperOrientation === 'portrait',
                      'wp-landscape': getCurrentWallpaperOrientation === 'landscape'
                    }"
                    alt="当前壁纸" 
                  />
                  <div v-if="getCurrentWallpaperOrientation === 'portrait'" class="wp-portrait-bg">
                    <img :src="wallpaperStore.currentWallpaper" class="wp-portrait-bg-img" alt="背景" />
                  </div>
                </template>
                <div v-else class="wp-preview-empty">
                  <Palette :size="40" class="wp-preview-empty-icon" />
                  <p>未设置壁纸，使用默认背景色</p>
                </div>
              </div>
              <div class="wp-preview-footer">
                <button v-if="wallpaperStore.hasWallpaper" @click="handleClearWallpaper" class="wp-action-btn danger-ghost">
                  <Trash2 :size="14" />
                  清除壁纸
                </button>
              </div>
            </div>
          </div>

          <!-- 右栏：壁纸库和启动动画 -->
          <div class="wp-right-column">
            <!-- 壁纸库卡片 -->
            <div class="wp-library-card">
              <div class="wp-library-header">
                <div class="wp-toolbar-left">
                  <Image :size="16" class="text-primary" />
                  <span class="wp-toolbar-label">壁纸库</span>
                  <span class="wp-count-badge">{{ wallpaperStore.wallpaperCount }}</span>
                </div>
                <div class="wp-toolbar-right">
                  <div class="wp-option-inline">
                    <span class="wp-option-label">双击切换</span>
                    <button @click="handleDoubleClickToggle" class="toggle-button" :class="{ active: wallpaperStore.doubleClickToChange }">
                      <div class="toggle-slider" :class="{ active: wallpaperStore.doubleClickToChange }"></div>
                    </button>
                  </div>
                  <button @click="handleAddWallpaper" class="wp-action-btn primary">
                    <Upload :size="14" />
                    上传壁纸
                  </button>
                  <button v-if="wallpaperStore.wallpaperCount > 0" @click="handleClearAllWallpapers" class="wp-action-btn danger-ghost" title="清空所有壁纸">
                    <Trash2 :size="14" />
                    清空
                  </button>
                </div>
              </div>
              <div class="wp-library-body">
                <div class="wp-grid" v-if="wallpaperStore.wallpaperCount > 0">
                  <div
                    v-for="(bg, index) in wallpaperStore.wallpapers"
                    :key="bg.id"
                    class="wp-card"
                    :class="{ selected: wallpaperStore.selectedWallpaperId === bg.id, using: wallpaperStore.isActive(bg.id) }"
                    @click="handleWallpaperSelect(bg)"
                    @dblclick="handleWallpaperDoubleClick(bg)"
                  >
                    <div class="wp-card-img">
                      <img :src="bg.thumbnailUrl || wallpaperStore.getThumbnailUrl(bg.path)" :alt="bg.name" loading="lazy" decoding="async" />
                      <div class="wp-card-overlay">
                        <span class="wp-card-num">{{ index + 1 }}</span>
                        <span v-if="bg.orientation === 'portrait'" class="wp-card-orientation">竖屏</span>
                        <span v-else-if="bg.orientation === 'landscape'" class="wp-card-orientation">横屏</span>
                        <span v-else-if="bg.orientation === 'square'" class="wp-card-orientation">方形</span>
                        <span v-if="wallpaperStore.isActive(bg.id)" class="wp-card-using"><Check :size="10" /> 使用中</span>
                        <button @click.stop="handleDeleteBackground(bg.id)" class="wp-card-del"><X :size="12" /></button>
                      </div>
                    </div>
                    <div class="wp-card-name">
                      <span>{{ bg.name }}</span>
                      <span v-if="wallpaperStore.doubleClickToChange && wallpaperStore.selectedWallpaperId === bg.id && !wallpaperStore.isActive(bg.id)" class="wp-badge preview">预览</span>
                    </div>
                  </div>
                </div>
                <div v-else class="wp-empty">
                  <Image :size="36" class="wp-empty-icon" />
                  <p>暂无壁纸</p>
                  <span>点击左栏「上传壁纸」按钮添加</span>
                </div>
              </div>
            </div>

            <!-- 启动动画卡片（独立） -->
            <div class="wp-splash-card">
              <div class="wp-splash-header">
                <Sparkles :size="18" class="inline-icon" />
                <span class="wp-splash-title">启动动画</span>
                <button class="toggle-button" :class="{ active: splashScreenEnabled }" @click="splashScreenEnabled = !splashScreenEnabled">
                  <div class="toggle-slider" :class="{ active: splashScreenEnabled }"></div>
                </button>
              </div>
              <div class="wp-splash-body" v-if="splashScreenEnabled">
                <p class="wp-splash-desc">选择动画样式</p>
                <div class="wp-splash-options">
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
                <div class="wp-splash-wallpaper-option">
                  <div class="wp-splash-wallpaper-text">
                    <span class="wp-option-label">使用壁纸作为动画背景</span>
                    <p class="wp-splash-wallpaper-hint">开启后，启动动画将使用当前壁纸作为背景</p>
                  </div>
                  <button class="toggle-button" :class="{ active: splashScreenUseWallpaper }" @click="splashScreenUseWallpaper = !splashScreenUseWallpaper">
                    <div class="toggle-slider" :class="{ active: splashScreenUseWallpaper }"></div>
                  </button>
                </div>
              </div>
              <div class="wp-splash-disabled" v-else>
                <p>启动动画已禁用，程序将直接显示主界面</p>
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
            <div class="setting-title">局域网传输模式</div>
          </div>
          <p class="setting-desc">设置局域网分享视频时的传输方式</p>
          <div class="setting-options">
            <button
              v-for="option in [
                { value: 'streaming' as const, label: '流式传输', desc: '推荐 · 低内存' },
                { value: 'buffered' as const, label: '缓冲传输', desc: '兼容性好' }
              ]"
              :key="option.value"
              class="option-button"
              :class="{ active: lanTransferMode === option.value }"
              @click="handleLanTransferModeChange(option.value)"
            >
              <div class="option-label">{{ option.label }}</div>
              <div class="option-desc">{{ option.desc }}</div>
            </button>
          </div>
          <div class="setting-hint">
            <span class="hint-icon">💡</span>
            流式传输：边读边发，内存占用恒定（约1MB），适合大文件<br/>
            缓冲传输：先读取整个文件再发送，可能占用较多内存
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
        
        <!-- 文件夹结构区域 -->
        <div class="section">
          <div class="section-header">
            <FolderOpen :size="16" class="inline-icon" />
            <h3 class="section-title">数据文件夹</h3>
            <button @click="loadFolderStructure" class="refresh-btn" :disabled="isLoadingFolder">
              <RefreshCw :size="14" :class="{ 'spinning': isLoadingFolder }" />
            </button>
          </div>
          <p class="section-desc">查看当前项目的文件夹结构和数据存储情况</p>
          
          <div class="folder-structure-card">
            <!-- 总占用空间统计 -->
            <div class="folder-stats">
              <div class="stat-item">
                <span class="stat-label">总占用空间</span>
                <span class="stat-value">{{ formatFileSize(folderStructure.reduce((total, node) => total + calculateFolderSize(node), 0)) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">文件夹数</span>
                <span class="stat-value">{{ folderStructure.filter(n => n.is_dir).length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">文件数</span>
                <span class="stat-value">{{ folderStructure.filter(n => !n.is_dir).length }}</span>
              </div>
            </div>
            
            <div class="folder-tree" v-if="folderStructure.length > 0">
              <div v-for="node in folderStructure" :key="node.path" class="folder-node">
                <div 
                  class="folder-item" 
                  :class="{ 'is-dir': node.is_dir }"
                  @click="node.is_dir && toggleFolder(node.path)"
                >
                  <ChevronRight 
                    v-if="node.is_dir && !expandedFolders.has(node.path)" 
                    :size="14" 
                    class="folder-chevron"
                  />
                  <ChevronDown 
                    v-else-if="node.is_dir && expandedFolders.has(node.path)" 
                    :size="14" 
                    class="folder-chevron"
                  />
                  <span v-else class="folder-chevron-placeholder"></span>
                  <Folder v-if="node.is_dir" :size="14" class="folder-icon" />
                  <File v-else :size="14" class="file-icon" />
                  <span class="folder-name">{{ node.name }}</span>
                  <span v-if="getFolderDescription(node.name)" class="folder-desc">{{ getFolderDescription(node.name) }}</span>
                  <span class="folder-size">{{ formatFileSize(node.is_dir ? calculateFolderSize(node) : (node.size || 0)) }}</span>
                </div>
                <div 
                  v-if="node.is_dir && node.children && expandedFolders.has(node.path)" 
                  class="folder-children"
                >
                  <div v-for="child in node.children" :key="child.path" class="folder-node">
                    <div class="folder-item" :class="{ 'is-dir': child.is_dir }">
                      <span class="folder-chevron-placeholder"></span>
                      <Folder v-if="child.is_dir" :size="14" class="folder-icon" />
                      <File v-else :size="14" class="file-icon" />
                      <span class="folder-name">{{ child.name }}</span>
                      <span v-if="getFolderDescription(child.name)" class="folder-desc">{{ getFolderDescription(child.name) }}</span>
                      <span class="folder-size">{{ formatFileSize(child.is_dir ? calculateFolderSize(child) : (child.size || 0)) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="folder-empty">
              <FolderOpen :size="32" class="folder-empty-icon" />
              <p>暂无数据</p>
            </div>
            
            <div class="folder-actions">
              <button @click="handleOpenDataFolder" class="folder-action-btn">
                <FolderOpen :size="14" />
                打开文件夹
              </button>
            </div>
            
            <!-- 恢复出厂设置区域 -->
            <div class="factory-reset-section">
              <div class="factory-reset-header">
                <Trash2 :size="16" class="danger-icon" />
                <span class="factory-reset-title">清空所有数据</span>
              </div>
              <p class="factory-reset-desc">
                此操作将永久删除所有数据，包括对话记录、媒体文件、配置等。建议先导出数据备份。
              </p>
              <div class="factory-reset-items">
                <div class="reset-item">
                  <span class="reset-item-icon">💬</span>
                  <span>对话记录和模型配置</span>
                </div>
                <div class="reset-item">
                  <span class="reset-item-icon">🖼️</span>
                  <span>图片、视频、壁纸</span>
                </div>
                <div class="reset-item">
                  <span class="reset-item-icon">⚙️</span>
                  <span>缓存和配置文件</span>
                </div>
              </div>
              <button
                @click="handleResetToFactory"
                class="factory-reset-btn"
                :disabled="isResetting"
              >
                <Trash2 :size="14" />
                {{ isResetting ? '正在清空...' : '恢复出厂设置' }}
              </button>
            </div>
          </div>
        </div>
        
        <!-- 数据导入导出区域 -->
        <div class="section">
          <div class="section-header">
            <Download :size="16" class="inline-icon" />
            <h3 class="section-title">数据管理</h3>
          </div>
          <p class="section-desc">导出当前数据用于备份或分享，或从备份文件恢复数据</p>
          
          <div class="data-actions">
            <button @click="handleExportData" class="data-action-btn export">
              <Download :size="16" />
              <span>导出数据</span>
              <small>将所有数据打包为ZIP文件</small>
            </button>
            <button @click="handleImportData" class="data-action-btn import">
              <Upload :size="16" />
              <span>导入数据</span>
              <small>从ZIP备份文件恢复数据</small>
            </button>
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
  background-color: transparent;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

.settings-content::-webkit-scrollbar {
  width: 6px;
}

.settings-content::-webkit-scrollbar-track {
  background: transparent;
}

.settings-content::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 3px;
  transition: background-color 0.2s;
}

.settings-content::-webkit-scrollbar-thumb:hover {
  background-color: var(--text-tertiary);
}

.tab-content {
  max-width: 800px;
  margin: 0 auto;
}

.tab-content.wallpaper-tab {
  max-width: 100%;
}

/* 两栏布局 */
.wp-two-column-layout {
  display: grid;
  grid-template-columns: 6fr 4fr;
  gap: 24px;
  min-height: 600px;
}

.wp-left-column {
  display: flex;
  flex-direction: column;
}

.wp-right-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 壁纸预览卡片 */
.wp-preview-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.wp-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.wp-preview-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.wp-preview-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.wp-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.wp-badge.using {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.wp-badge.none {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.wp-badge.preview {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
}

.wp-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.wp-action-btn.primary {
  background: var(--primary-color);
  color: white;
}

.wp-action-btn.primary:hover {
  opacity: 0.9;
}

.wp-action-btn.danger-ghost {
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.wp-action-btn.danger-ghost:hover {
  background: rgba(239, 68, 68, 0.15);
}

.wp-preview-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  overflow: hidden;
  min-height: 300px;
  position: relative;
}

.wp-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: relative;
  z-index: 2;
}

.wp-preview-img.wp-portrait {
  object-fit: contain;
  object-position: center center;
  background: transparent;
}

.wp-preview-img.wp-landscape {
  object-fit: cover;
}

.wp-portrait-bg {
  position: absolute;
  inset: -30px;
  z-index: 1;
  overflow: hidden;
  background-color: var(--bg-primary);
}

.wp-portrait-bg-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  filter: blur(50px) brightness(0.7);
  transform: scale(1.3);
}

.wp-preview-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.wp-preview-hint {
  color: white;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  background: rgba(59, 130, 246, 0.9);
  border-radius: 6px;
}

.wp-preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-tertiary);
}

.wp-preview-empty-icon {
  opacity: 0.3;
}

.wp-preview-empty p {
  font-size: 14px;
  margin: 0;
}

.wp-preview-footer {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

/* 壁纸库卡片 */
.wp-library-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.wp-library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.wp-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wp-toolbar-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.wp-count-badge {
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--primary-color);
  color: white;
  font-size: 11px;
  font-weight: 600;
}

.wp-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wp-option-inline {
  display: flex;
  align-items: center;
  gap: 10px;
}

.wp-option-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.wp-library-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

.wp-library-body::-webkit-scrollbar {
  width: 6px;
}

.wp-library-body::-webkit-scrollbar-track {
  background: transparent;
}

.wp-library-body::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 3px;
}

.wp-library-body::-webkit-scrollbar-thumb:hover {
  background-color: var(--text-tertiary);
}

/* 壁纸网格 */
.wp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.wp-card {
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid transparent;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.wp-card:hover {
  border-color: var(--border-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.wp-card.selected {
  border-color: var(--primary-color);
}

.wp-card.using {
  border-color: #10b981;
}

.wp-card-img {
  position: relative;
  aspect-ratio: 16/10;
  overflow: hidden;
  background: var(--bg-tertiary);
}

.wp-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.wp-card:hover .wp-card-img img {
  transform: scale(1.05);
}

.wp-card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.5) 100%);
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
}

.wp-card.using .wp-card-overlay {
  opacity: 1;
}

.wp-card:hover .wp-card-overlay {
  opacity: 1;
}

.wp-card-num {
  align-self: flex-start;
  padding: 2px 7px;
  border-radius: 5px;
  background: rgba(0,0,0,0.6);
  color: white;
  font-size: 10px;
  font-weight: 600;
}

.wp-card-orientation {
  align-self: flex-start;
  padding: 2px 7px;
  border-radius: 5px;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  font-size: 10px;
  font-weight: 500;
  margin-left: 4px;
}

.wp-card-using {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  border-radius: 5px;
  background: rgba(16, 185, 129, 0.9);
  color: white;
  font-size: 10px;
  font-weight: 500;
}

.wp-card-del {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.wp-card-del:hover {
  background: #ef4444;
  transform: scale(1.1);
}

.wp-card-name {
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}

.wp-card-name span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

/* 壁纸空状态 */
.wp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 8px;
  background: var(--bg-tertiary);
  border: 1px dashed var(--border-color);
  border-radius: 12px;
  color: var(--text-tertiary);
}

.wp-empty-icon {
  opacity: 0.3;
  margin-bottom: 8px;
}

.wp-empty p {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
}

.wp-empty span {
  font-size: 12px;
}

/* 启动动画卡片 */
.wp-splash-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
}

.wp-splash-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.wp-splash-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.wp-splash-body {
  padding: 20px;
}

.wp-splash-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 12px;
  font-weight: 500;
}

.wp-splash-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.wp-splash-wallpaper-option {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.wp-splash-wallpaper-text {
  flex: 1;
}

.wp-splash-wallpaper-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-tertiary);
}

.wp-splash-disabled {
  padding: 20px;
  text-align: center;
}

.wp-splash-disabled p {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
}

.section {
  margin-bottom: 40px;
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-desc {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-bottom: 20px;
  line-height: 1.5;
}

.inline-icon {
  color: var(--primary-color);
}

.theme-category {
  margin-bottom: 32px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.category-line {
  width: 36px;
  height: 4px;
  background-color: var(--primary-color);
  border-radius: 2px;
}

.category-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.category-desc {
  font-size: 13px;
  color: var(--text-tertiary);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.theme-card {
  padding: 18px;
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



.toggle-button {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-button.active {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.toggle-slider.active {
  left: 22px;
}









.setting-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.setting-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.setting-icon {
  color: var(--primary-color);
}

.setting-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.setting-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
  line-height: 1.5;
}

.setting-hint {
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.hint-icon {
  margin-right: 4px;
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
  padding-top: 4px;
}

.toggle-button {
  position: relative;
  width: 48px;
  height: 26px;
  border-radius: 13px;
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
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.toggle-slider.active {
  left: 25px;
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
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.splash-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 12px;
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

/* 文件夹结构样式 */
.refresh-btn {
  margin-left: auto;
  padding: 4px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.refresh-btn:disabled {
  cursor: not-allowed;
}

.refresh-btn .spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.folder-structure-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  overflow-y: auto;
  position: relative;
}

.folder-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.folder-tree {
  font-size: 13px;
  margin-bottom: 12px;
}

.folder-node {
  user-select: none;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: default;
  transition: background 0.15s;
}

.folder-item.is-dir {
  cursor: pointer;
}

.folder-item.is-dir:hover {
  background: var(--bg-tertiary);
}

.folder-chevron {
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.folder-chevron-placeholder {
  width: 14px;
  flex-shrink: 0;
}

.folder-icon {
  flex-shrink: 0;
  color: #f59e0b;
}

.file-icon {
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.folder-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}

.folder-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  margin: 0 8px;
  font-style: italic;
}

.folder-size {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-tertiary);
}

.folder-children {
  margin-left: 20px;
  border-left: 1px solid var(--border-light);
  padding-left: 8px;
}

.folder-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 12px;
  color: var(--text-tertiary);
}

.folder-empty-icon {
  opacity: 0.3;
}

.folder-empty p {
  margin: 0;
  font-size: 14px;
}

.folder-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.folder-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.folder-action-btn:hover {
  background: var(--primary-light);
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.factory-reset-section {
  margin-top: 16px;
  padding: 16px;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
}

.factory-reset-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.danger-icon {
  color: #ef4444;
}

.factory-reset-title {
  font-size: 15px;
  font-weight: 600;
  color: #ef4444;
}

.factory-reset-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 12px;
  line-height: 1.5;
}

.factory-reset-items {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.reset-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-primary);
}

.reset-item-icon {
  font-size: 14px;
}

.factory-reset-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.factory-reset-btn:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
}

.factory-reset-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 数据导入导出样式 */
.data-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.data-action-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
  border-radius: 12px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.data-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.data-action-btn.export {
  border-color: #10b981;
}

.data-action-btn.export:hover {
  background: rgba(16, 185, 129, 0.05);
}

.data-action-btn.import {
  border-color: #3b82f6;
}

.data-action-btn.import:hover {
  background: rgba(59, 130, 246, 0.05);
}

.data-action-btn span {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.data-action-btn small {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.4;
}

/* 局域网共享样式 */
.lan-share-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
}

.lan-share-start {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lan-share-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lan-label {
  font-size: 14px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.lan-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.lan-input:focus {
  border-color: var(--primary-color);
}

.lan-start-btn, .lan-stop-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.lan-start-btn {
  background: #10b981;
  color: white;
}

.lan-start-btn:hover {
  background: #059669;
}

.lan-stop-btn {
  background: #ef4444;
  color: white;
}

.lan-stop-btn:hover {
  background: #dc2626;
}

.lan-share-active {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lan-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lan-status-icon {
  width: 24px;
  height: 24px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}

.lan-status-text {
  font-size: 14px;
  font-weight: 600;
  color: #10b981;
}

.lan-address {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lan-address-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.lan-address-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.lan-address-text {
  flex: 1;
  font-size: 14px;
  color: var(--primary-color);
  font-weight: 500;
  font-family: monospace;
}

.lan-copy-btn {
  padding: 6px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.lan-copy-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .wp-two-column-layout {
    grid-template-columns: 1fr;
    min-height: auto;
  }
  
  .wp-preview-card {
    height: auto;
  }
  
  .wp-preview-body {
    min-height: 250px;
  }
  
  .wp-library-card {
    min-height: 400px;
  }
}

@media (max-width: 768px) {
  .wp-splash-options {
    grid-template-columns: 1fr;
  }
  
  .wp-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}
</style>
