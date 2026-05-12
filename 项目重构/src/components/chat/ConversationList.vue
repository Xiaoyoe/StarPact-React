<script setup lang="ts">
import { ref, computed } from 'vue';
import { MessageSquare, Star, Trash2, X } from 'lucide-vue-next';
import { useConversationStore } from '@/stores';
import { useToast } from '@/composables/useToast';

const conversationStore = useConversationStore();
const toast = useToast();

const isOpen = ref(false);
const searchQuery = ref('');

const filteredConversations = computed(() => {
  if (!searchQuery.value) return conversationStore.conversations;
  const query = searchQuery.value.toLowerCase();
  return conversationStore.conversations.filter(c => 
    c.title.toLowerCase().includes(query)
  );
});

const handleSelectConversation = (id: string) => {
  conversationStore.setActiveConversation(id);
  isOpen.value = false;
};

const handleDeleteConversation = async (id: string, event: Event) => {
  event.stopPropagation();
  
  const success = await conversationStore.deleteConversation(id);
  if (success) {
    toast.success('会话已删除');
  } else {
    toast.error('删除失败');
  }
};

const handleToggleFavorite = async (id: string, event: Event) => {
  event.stopPropagation();
  
  const success = await conversationStore.toggleFavorite(id);
  if (success) {
    toast.success('收藏状态已更新');
  } else {
    toast.error('更新失败');
  }
};

const handleCreateNew = async () => {
  await conversationStore.createNewConversation();
  isOpen.value = false;
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.conversation-list-panel')) {
    isOpen.value = false;
  }
};

if (typeof window !== 'undefined') {
  document.addEventListener('click', handleClickOutside);
}
</script>

<template>
  <div class="conversation-list-panel" @click.stop>
    <button
      class="toggle-btn"
      :class="{ 'is-open': isOpen }"
      @click="isOpen = !isOpen"
      title="聊天记录"
    >
      <MessageSquare :size="20" />
      <span v-if="conversationStore.conversations.length > 0" class="badge">
        {{ conversationStore.conversations.length }}
      </span>
    </button>

    <Transition name="slide">
      <div v-if="isOpen" class="panel">
        <div class="panel-header">
          <h3>聊天记录</h3>
          <button class="close-btn" @click="isOpen = false">
            <X :size="16" />
          </button>
        </div>

        <div class="panel-content">
          <button class="new-chat-btn" @click="handleCreateNew">
            <MessageSquare :size="16" />
            新建对话
          </button>

          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索会话..."
              class="search-input"
            />
          </div>

          <div class="conversations-list">
            <div
              v-for="conv in filteredConversations"
              :key="conv.id"
              class="conversation-item"
              :class="{ active: conv.id === conversationStore.activeConversationId }"
              @click="handleSelectConversation(conv.id)"
            >
              <div class="conv-info">
                <div class="conv-title">{{ conv.title }}</div>
                <div class="conv-meta">
                  <span class="conv-date">{{ formatDate(conv.updated_at) }}</span>
                  <span class="conv-messages">{{ conv.messages.length }} 条消息</span>
                </div>
              </div>
              
              <div class="conv-actions">
                <button
                  class="action-btn"
                  :class="{ favorited: conv.is_favorite }"
                  @click="handleToggleFavorite(conv.id, $event)"
                  title="收藏"
                >
                  <Star :size="14" :fill="conv.is_favorite ? 'currentColor' : 'none'" />
                </button>
                <button
                  class="action-btn delete"
                  @click="handleDeleteConversation(conv.id, $event)"
                  title="删除"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>

            <div v-if="filteredConversations.length === 0" class="empty-state">
              <MessageSquare :size="32" />
              <p>暂无聊天记录</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.conversation-list-panel {
  position: relative;
}

.toggle-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.toggle-btn.is-open {
  background-color: var(--primary-color);
  color: white;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background-color: var(--primary-color);
  color: white;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.panel {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  width: 320px;
  max-height: 500px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.panel-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 12px;
  padding: 10px;
  border-radius: 8px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.new-chat-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.search-box {
  padding: 0 12px 12px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: var(--primary-color);
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.conversation-item:hover {
  background-color: var(--bg-secondary);
}

.conversation-item.active {
  background-color: var(--primary-light);
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.conv-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.conversation-item:hover .conv-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.action-btn.favorited {
  color: #f59e0b;
}

.action-btn.delete:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: var(--text-tertiary);
}

.empty-state p {
  margin-top: 8px;
  font-size: 13px;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
