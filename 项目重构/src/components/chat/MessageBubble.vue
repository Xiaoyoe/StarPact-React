<script setup lang="ts">
import { ref, computed } from 'vue';
import { Bot, User, Copy, RotateCcw, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-vue-next';
import type { ChatMessage } from '@/types';
import { useToast } from '@/composables/useToast';

interface Props {
  message: ChatMessage;
  isLast?: boolean;
  compactMode?: boolean;
  streamingContent?: string;
  streamingThinking?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isLast: false,
  compactMode: false,
});

const emit = defineEmits<{
  imageClick: [images: string[], index: number];
  regenerate: [content: string, images?: string[]];
  delete: [messageId: string];
}>();

const toast = useToast();
const showThinking = ref(false);

const isUser = computed(() => props.message.role === 'user');
const isStreaming = computed(() => props.message.isStreaming);

const displayContent = computed(() => {
  if (isStreaming.value && props.streamingContent) {
    return props.streamingContent;
  }
  return props.message.content;
});

const displayThinking = computed(() => {
  if (isStreaming.value && props.streamingThinking) {
    return props.streamingThinking;
  }
  return props.message.thinking;
});

const hasThinking = computed(() => {
  return displayThinking.value && displayThinking.value.length > 0;
});

const hasImages = computed(() => {
  return props.message.images && props.message.images.length > 0;
});

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(displayContent.value);
    toast.success('已复制到剪贴板');
  } catch (error) {
    toast.error('复制失败');
  }
};

const handleRegenerate = () => {
  emit('regenerate', props.message.content, props.message.images);
};

const handleDelete = () => {
  emit('delete', props.message.id);
};

const handleImageClick = (index: number) => {
  if (props.message.images) {
    emit('imageClick', props.message.images, index);
  }
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const toggleThinking = () => {
  showThinking.value = !showThinking.value;
};
</script>

<template>
  <div 
    class="message-bubble"
    :class="{ 
      'is-user': isUser,
      'is-assistant': !isUser,
      'is-compact': compactMode,
      'is-streaming': isStreaming
    }"
  >
    <div class="message-container">
      <div v-if="!compactMode" class="message-avatar">
        <div class="avatar-icon" :class="{ 'is-user': isUser }">
          <User v-if="isUser" :size="16" />
          <Bot v-else :size="16" />
        </div>
      </div>

      <div class="message-content">
        <div v-if="!compactMode" class="message-header">
          <span class="message-role">{{ isUser ? '你' : (message.modelName || 'AI') }}</span>
          <span class="message-time">{{ formatTime(message.timestamp) }}</span>
        </div>

        <div v-if="hasImages" class="message-images">
          <img
            v-for="(img, index) in message.images"
            :key="index"
            :src="img"
            :alt="`图片 ${index + 1}`"
            class="message-image"
            @click="handleImageClick(index)"
          />
        </div>

        <div v-if="hasThinking" class="thinking-section">
          <button class="thinking-toggle" @click="toggleThinking">
            <ChevronDown v-if="!showThinking" :size="14" />
            <ChevronUp v-else :size="14" />
            <span>思考过程</span>
            <span v-if="message.thinkingDuration" class="thinking-duration">
              {{ message.thinkingDuration.toFixed(1) }}s
            </span>
          </button>
          <Transition name="thinking">
            <div v-if="showThinking" class="thinking-content">
              {{ displayThinking }}
            </div>
          </Transition>
        </div>

        <div class="message-text">
          <div v-if="isStreaming && !displayContent" class="streaming-indicator">
            <Loader2 :size="16" class="animate-spin" />
            <span>正在思考...</span>
          </div>
          <div v-else class="text-content">
            {{ displayContent }}
          </div>
        </div>

        <div v-if="!isStreaming" class="message-actions">
          <button class="action-btn" @click="handleCopy" title="复制">
            <Copy :size="12" />
          </button>
          <button v-if="isUser" class="action-btn" @click="handleRegenerate" title="重新生成">
            <RotateCcw :size="12" />
          </button>
          <button class="action-btn delete" @click="handleDelete" title="删除">
            <Trash2 :size="12" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-bubble {
  display: flex;
  margin-bottom: 16px;
  transition: all 0.2s ease;
}

.message-bubble.is-user {
  justify-content: flex-end;
}

.message-bubble.is-assistant {
  justify-content: flex-start;
}

.message-bubble.is-compact {
  margin-bottom: 8px;
}

.message-container {
  display: flex;
  gap: 12px;
  max-width: 75%;
}

.message-bubble.is-user .message-container {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.avatar-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-tertiary);
  color: var(--primary-color);
}

.avatar-icon.is-user {
  background-color: var(--primary-color);
  color: white;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.message-role {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.message-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

.message-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.message-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease;
  border: 1px solid var(--border-color);
}

.message-image:hover {
  transform: scale(1.05);
}

.thinking-section {
  margin-bottom: 8px;
  padding: 8px 12px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
  border-left: 3px solid var(--primary-color);
}

.thinking-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.thinking-toggle:hover {
  background: var(--bg-tertiary);
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.thinking-duration {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-tertiary);
}

.thinking-content {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
}

.message-text {
  padding: 12px 16px;
  border-radius: 16px;
  background-color: var(--bg-chat-ai);
  border: 1px solid var(--border-color);
  line-height: 1.6;
  word-wrap: break-word;
}

.message-bubble.is-user .message-text {
  background-color: var(--bg-chat-user);
  color: var(--text-primary);
  border-color: var(--border-color);
  border-top-right-radius: 4px;
}

.message-bubble.is-assistant .message-text {
  border-top-left-radius: 4px;
}

.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-tertiary);
  font-size: 13px;
}

.text-content {
  white-space: pre-wrap;
  font-size: 14px;
  color: var(--text-primary);
}

.message-actions {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  justify-content: flex-end;
}

.message-bubble.is-user .message-actions {
  justify-content: flex-start;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 6px;
  background-color: transparent;
  border: none;
  color: var(--text-tertiary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 4px;
}

.action-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.action-btn.delete:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.thinking-enter-active,
.thinking-leave-active {
  transition: all 0.2s ease;
}

.thinking-enter-from,
.thinking-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
