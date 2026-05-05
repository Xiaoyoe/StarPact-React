<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useThemeStore, useAppStore, useConversationStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import {
  MessageSquare, Bot, Settings, Plus, Search, Star,
  ChevronLeft, ChevronRight, Trash2,
  BookOpen, FileText, Settings2, Image, Play, Clapperboard, Globe, Cpu,
  ChevronUp, ChevronDown, Sparkles, Timer, Database, Download
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const themeStore = useThemeStore();
const appStore = useAppStore();
const conversationStore = useConversationStore();
const toast = useToast();

const appNameDisplay = ref<'chinese' | 'english'>('english');
const bottomPanelsVisible = ref(true);
const hoveredConv = ref<string | null>(null);

const navItems = [
  { id: 'chat', icon: MessageSquare, label: '聊天', path: '/chat' },
  { id: 'models', icon: Bot, label: '模型管理', path: '/models' },
  { id: 'gallery', icon: Image, label: '图片管理', path: '/gallery' },
  { id: 'video-player', icon: Play, label: '视频播放器', path: '/video-player' },
  { id: 'media-tools', icon: Clapperboard, label: '媒体工具', path: '/media-tools' },
  { id: 'prompt-templates', icon: BookOpen, label: '提示词模板', path: '/prompt-templates' },
  { id: 'compare', icon: FileText, label: '文本对比', path: '/compare' },
  { id: 'ini-config', icon: Settings2, label: 'INI配置', path: '/ini-config' },
  { id: 'settings', icon: Settings, label: '设置', path: '/settings' },
];

const panelItems = [
  { id: 'model', icon: Sparkles, title: '模型指示器', subtitle: computed(() => conversationStore.activeModel?.name || '未选择模型') },
  { id: 'performance', icon: Timer, title: '性能查看', subtitle: '运行耗时与指标' },
  { id: 'logs', icon: FileText, title: '系统日志', subtitle: '0 条记录' },
  { id: 'wallpaper', icon: Image, title: '壁纸设置', subtitle: '未设置壁纸' },
  { id: 'database', icon: Database, title: '数据库管理', subtitle: '查看本地存储数据' },
  { id: 'download-guide', icon: Download, title: '下载指南', subtitle: 'Ollama与FFmpeg安装' },
];

const isActive = (path: string) => route.path === path;
const isChatPage = computed(() => route.path === '/chat');

const navigate = (path: string) => {
  router.push(path);
};

const handleNewChat = async () => {
  if (!conversationStore.activeModelId) {
    toast.error('请先选择一个模型');
    return;
  }
  await conversationStore.createNewConversation();
  router.push('/chat');
  toast.success('新建对话成功');
};

const handleThemeToggle = () => {
  const isLight = themeStore.theme === 'light';
  const newTheme = isLight ? 'dark' : 'light';
  themeStore.setTheme(newTheme);
  toast.success(`已切换到${isLight ? '深色' : '浅色'}主题`);
};

const handleWebShortcut = () => {
  toast.info('快捷网页功能开发中');
};

const handleOllamaManager = () => {
  toast.info('Ollama管理器功能开发中');
};

const formatTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${Math.floor(diff / 86400000)}天前`;
};

const selectConversation = (id: string) => {
  conversationStore.setActiveConversation(id);
};

const deleteConv = async (id: string) => {
  if (confirm('确定要删除这个对话吗？')) {
    await conversationStore.deleteConversation(id);
    toast.success('删除对话成功');
  }
};

onMounted(async () => {
  await conversationStore.loadModels();
  await conversationStore.loadConversations();
});
</script>

<template>
  <aside 
    class="sidebar"
    :class="{ collapsed: appStore.sidebarCollapsed }"
  >
    <!-- Header -->
    <div class="sidebar-header">
      <div v-if="!appStore.sidebarCollapsed" class="logo">
        <div class="logo-icon">
          <Bot :size="18" color="white" />
        </div>
        <span class="logo-text">
          {{ appNameDisplay === 'chinese' ? '星约' : 'Starpact' }}
        </span>
      </div>
      <button
        class="toggle-btn"
        @click="appStore.toggleSidebar"
        :title="appStore.sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
      >
        <ChevronLeft v-if="!appStore.sidebarCollapsed" :size="16" />
        <ChevronRight v-else :size="16" />
      </button>
    </div>

    <!-- New Chat Button -->
    <div class="new-chat-section">
      <button
        class="new-chat-btn"
        @click="handleNewChat"
        :title="appStore.sidebarCollapsed ? '新建对话' : undefined"
      >
        <Plus :size="18" />
        <span v-if="!appStore.sidebarCollapsed">新建对话</span>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <button
        v-for="item in navItems"
        :key="item.id"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        @click="navigate(item.path)"
        :title="appStore.sidebarCollapsed ? item.label : undefined"
      >
        <component :is="item.icon" :size="18" class="nav-icon" />
        <span v-if="!appStore.sidebarCollapsed" class="nav-text">
          {{ item.label }}
        </span>
      </button>
    </nav>

    <!-- Divider -->
    <div class="sidebar-divider"></div>

    <!-- Search (Chat page only) -->
    <div v-if="!appStore.sidebarCollapsed && isChatPage" class="search-section">
      <div class="search-box">
        <Search :size="14" class="search-icon" />
        <input
          type="text"
          placeholder="搜索对话..."
          :value="conversationStore.searchQuery"
          @input="conversationStore.setSearchQuery(($event.target as HTMLInputElement).value)"
          class="search-input"
        />
      </div>
    </div>

    <!-- Conversations List (Chat page only) -->
    <div v-if="isChatPage" class="conversations-section">
      <div v-if="!appStore.sidebarCollapsed" class="conversations-header">
        对话记录 ({{ conversationStore.filteredConversations.length }})
      </div>
      
      <div class="conversations-list">
        <div
          v-for="conv in conversationStore.filteredConversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: conversationStore.activeConversationId === conv.id }"
          @click="selectConversation(conv.id)"
          @mouseenter="hoveredConv = conv.id"
          @mouseleave="hoveredConv = null"
        >
          <template v-if="appStore.sidebarCollapsed">
            <div class="conv-icon-only">
              <MessageSquare :size="16" />
            </div>
          </template>
          <template v-else>
            <div class="conv-content">
              <div class="conv-title-row">
                <Star 
                  v-if="conv.is_favorite" 
                  :size="12" 
                  class="star-icon"
                  fill="var(--warning-color)"
                />
                <span class="conv-title">{{ conv.title }}</span>
              </div>
              <div class="conv-meta">
                <span>{{ conversationStore.models.find(m => m.id === conv.model_id)?.name || '未知模型' }}</span>
                <span>·</span>
                <span>{{ formatTime(conv.updated_at) }}</span>
                <template v-if="conv.total_tokens && conv.total_tokens > 0">
                  <span>·</span>
                  <span class="token-count">
                    {{ conv.total_tokens >= 1000 ? `${(conv.total_tokens / 1000).toFixed(1)}K` : conv.total_tokens }}
                  </span>
                </template>
              </div>
            </div>
            <button
              v-if="hoveredConv === conv.id"
              class="delete-btn"
              @click.stop="deleteConv(conv.id)"
              title="删除对话"
            >
              <Trash2 :size="14" />
            </button>
          </template>
        </div>
        
        <div v-if="conversationStore.filteredConversations.length === 0 && !appStore.sidebarCollapsed" class="empty-conversations">
          <MessageSquare :size="24" class="empty-icon" />
          <p>暂无对话</p>
        </div>
      </div>
    </div>

    <!-- Spacer for non-chat pages -->
    <div v-if="!isChatPage" class="sidebar-spacer"></div>

    <!-- Bottom Panels -->
    <div v-if="!appStore.sidebarCollapsed && bottomPanelsVisible" class="bottom-panels">
      <div
        v-for="panel in panelItems"
        :key="panel.id"
        class="panel-item"
      >
        <div class="panel-icon">
          <component :is="panel.icon" :size="14" />
        </div>
        <div class="panel-info">
          <div class="panel-title">{{ panel.title }}</div>
          <div class="panel-subtitle">{{ typeof panel.subtitle === 'string' ? panel.subtitle : panel.subtitle.value }}</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="sidebar-footer">
      <div v-if="appStore.sidebarCollapsed" class="footer-collapsed">
        <button class="footer-btn" @click="handleWebShortcut" title="快捷网页">
          <Globe :size="18" />
        </button>
        <button class="footer-btn" @click="handleOllamaManager" title="Ollama 管理器">
          <Cpu :size="18" />
        </button>
        <button class="footer-btn" @click="handleThemeToggle" :title="themeStore.isDark ? '切换到浅色主题' : '切换到深色主题'">
          <span class="theme-icon">{{ themeStore.isDark ? '🌙' : '☀️' }}</span>
        </button>
      </div>
      <div v-else class="footer-expanded">
        <button class="footer-btn" @click="handleThemeToggle" :title="themeStore.isDark ? '切换到浅色主题' : '切换到深色主题'">
          <span class="theme-icon">{{ themeStore.isDark ? '🌙' : '☀️' }}</span>
        </button>
        <button class="footer-btn" @click="handleWebShortcut" title="快捷网页">
          <Globe :size="18" />
        </button>
        <button class="footer-btn" @click="handleOllamaManager" title="Ollama 管理器">
          <Cpu :size="18" />
        </button>
        <button class="footer-btn" @click="bottomPanelsVisible = !bottomPanelsVisible" :title="bottomPanelsVisible ? '收起面板' : '展开面板'">
          <ChevronUp v-if="bottomPanelsVisible" :size="18" />
          <ChevronDown v-else :size="18" />
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 280px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  transition: width 0.2s ease;
  padding-bottom: 60px;
}

.sidebar.collapsed {
  width: 68px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  height: 56px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: var(--primary-color);
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  opacity: 0.8;
}

.new-chat-section {
  padding: 0 12px 8px;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--primary-color);
  border: none;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.new-chat-btn:hover {
  opacity: 0.9;
  transform: scale(0.98);
}

.sidebar.collapsed .new-chat-btn {
  padding: 10px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 12px 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

.nav-item:hover {
  opacity: 0.8;
}

.nav-item.active {
  background-color: var(--primary-light);
  color: var(--primary-color);
  font-weight: 600;
}

.nav-icon {
  flex-shrink: 0;
}

.nav-text {
  white-space: nowrap;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 8px;
}

.sidebar-divider {
  margin: 0 12px;
  border-top: 1px solid var(--border-light);
}

.search-section {
  padding: 8px 12px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
}

.search-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.conversations-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 8px 12px;
}

.conversations-header {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-tertiary);
  padding: 4px 4px 8px;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 2px;
}

.conversation-item:hover {
  background-color: var(--bg-tertiary);
}

.conversation-item.active {
  background-color: var(--primary-light);
}

.conv-icon-only {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.conversation-item.active .conv-icon-only {
  color: var(--primary-color);
}

.conv-content {
  flex: 1;
  min-width: 0;
}

.conv-title-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.star-icon {
  color: var(--warning-color);
  flex-shrink: 0;
}

.conv-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-item.active .conv-title {
  color: var(--primary-color);
  font-weight: 500;
}

.conv-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.token-count {
  color: var(--primary-color);
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.delete-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.empty-conversations {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
  color: var(--text-tertiary);
}

.empty-icon {
  margin-bottom: 12px;
  opacity: 0.3;
}

.empty-conversations p {
  font-size: 13px;
}

.sidebar-spacer {
  flex: 1;
}

.bottom-panels {
  padding: 8px 12px;
  max-height: 200px;
  overflow-y: auto;
}

.panel-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 4px;
}

.panel-item:hover {
  transform: scale(1.02);
}

.panel-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background-color: var(--primary-light);
  color: var(--primary-color);
}

.panel-info {
  flex: 1;
  min-width: 0;
}

.panel-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-subtitle {
  font-size: 11px;
  color: var(--text-tertiary);
}

.sidebar-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  transition: width 0.2s ease;
  z-index: 10;
}

.sidebar:not(.collapsed) .sidebar-footer {
  width: 280px;
}

.sidebar.collapsed .sidebar-footer {
  width: 68px;
}

.footer-collapsed {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  gap: 8px;
}

.footer-expanded {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 8px;
}

.footer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.footer-btn:hover {
  transform: scale(1.1);
}

.theme-icon {
  font-size: 18px;
}
</style>
