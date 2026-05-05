<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue';
import { useConversationStore, useWallpaperStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import {
  Send, Mic, Paperclip, Image, Smile, MoreHorizontal,
  Bot, User, Copy, ThumbsUp, ThumbsDown, RotateCcw,
  Sparkles, ChevronDown, X, Loader2, StopCircle, Settings, Pencil,
  Check, Square, HardDrive, Globe, Brain, Database, Eye, EyeOff,
  Sliders, RefreshCw, MessageSquare, Plus, Timer
} from 'lucide-vue-next';

const conversationStore = useConversationStore();
const wallpaperStore = useWallpaperStore();
const toast = useToast();

const messagesContainer = ref<HTMLElement | null>(null);
const inputText = ref('');
const isStreaming = ref(false);
const showModelSelector = ref(false);
const showToolsMenu = ref(false);
const compactMode = ref(false);
const showWelcome = ref(true);
const uploadedImages = ref<{ id: string; data: string; preview: string }[]>([]);
const streamingContent = ref('');

const activeConversation = computed(() => conversationStore.activeConversation);
const activeModel = computed(() => conversationStore.activeModel);
const messages = computed(() => activeConversation.value?.messages || []);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

watch(messages, () => {
  scrollToBottom();
}, { deep: true });

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const handleSend = async () => {
  if (!inputText.value.trim() || isStreaming.value) return;
  if (!activeModel.value) {
    toast.error('请先选择一个模型');
    return;
  }

  const content = inputText.value.trim();
  inputText.value = '';

  if (!activeConversation.value) {
    await conversationStore.createNewConversation();
  }

  if (!conversationStore.activeConversationId) {
    toast.error('创建对话失败');
    return;
  }

  const userMessage = {
    id: `msg_${Date.now()}`,
    role: 'user' as const,
    content,
    timestamp: Date.now(),
    images: uploadedImages.value.length > 0 ? uploadedImages.value.map(img => img.data) : undefined,
  };

  await conversationStore.addMessage(conversationStore.activeConversationId, userMessage);
  uploadedImages.value = [];

  isStreaming.value = true;

  const assistantMessage = {
    id: `msg_${Date.now() + 1}`,
    role: 'assistant' as const,
    content: '',
    timestamp: Date.now(),
    model_id: activeModel.value.id,
    model_name: activeModel.value.name,
    is_streaming: true,
  };

  await conversationStore.addMessage(conversationStore.activeConversationId, assistantMessage);

  setTimeout(async () => {
    const response = generateMockResponse(content);
    await conversationStore.updateMessage(
      conversationStore.activeConversationId!,
      assistantMessage.id,
      { content: response, is_streaming: false }
    );
    isStreaming.value = false;
    scrollToBottom();
  }, 1500);
};

const generateMockResponse = (input: string): string => {
  const responses = [
    `这是一个关于"${input.substring(0, 20)}..."的模拟回复。在实际应用中，这里会显示AI模型生成的真实回复内容。`,
    `感谢您的提问！关于您提到的内容，我可以提供以下信息...\n\n1. 首先，让我们了解一下背景...\n2. 其次，需要考虑的因素包括...\n3. 最后，建议您可以...`,
    `这是一个很好的问题！让我来为您详细解答。\n\n**核心要点：**\n- 第一点：相关背景知识\n- 第二点：具体实现方法\n- 第三点：注意事项和建议\n\n希望这个回答对您有帮助！`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};

const handleStopStreaming = () => {
  isStreaming.value = false;
  toast.info('已停止生成');
};

const handleCopy = (content: string) => {
  navigator.clipboard.writeText(content);
  toast.success('已复制到剪贴板');
};

const handleRegenerate = () => {
  toast.info('重新生成功能开发中');
};

const handleModelSelect = (modelId: string) => {
  conversationStore.setActiveModel(modelId);
  showModelSelector.value = false;
  toast.success('已切换模型');
};

const handleImageUpload = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  
  input.onchange = (e: any) => {
    const files = Array.from(e.target.files) as File[];
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error('只支持图片文件');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('图片大小不能超过 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = ev.target?.result as string;
        uploadedImages.value.push({
          id: generateId(),
          data,
          preview: data,
        });
      };
      reader.readAsDataURL(file);
    });
  };
  
  input.click();
};

const handleRemoveImage = (id: string) => {
  uploadedImages.value = uploadedImages.value.filter(img => img.id !== id);
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const startChat = () => {
  showWelcome.value = false;
};

const suggestionClick = (text: string) => {
  inputText.value = text;
  showWelcome.value = false;
};

onMounted(async () => {
  await scrollToBottom();
});
</script>

<template>
  <div 
    class="chat-view h-full flex flex-col" 
    :class="{ 'compact-mode': compactMode }"
  >
    <!-- Welcome Screen -->
    <div v-if="showWelcome" class="flex-1 flex items-center justify-center p-8">
      <div class="text-center max-w-2xl">
        <div class="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary-light flex items-center justify-center">
          <Sparkles :size="36" class="text-primary" />
        </div>
        <h1 class="text-2xl font-bold text-text-primary mb-3">欢迎使用 AI 助手</h1>
        <p class="text-text-secondary mb-8">
          选择一个模型开始对话，或尝试以下建议
        </p>
        
        <div class="grid grid-cols-2 gap-3 mb-8">
          <button
            v-for="suggestion in ['解释量子计算的原理', '用Python实现排序算法', '设计一个REST API', '推荐学习资源']"
            :key="suggestion"
            @click="suggestionClick(suggestion)"
            class="p-4 rounded-xl border border-border bg-background-secondary text-left hover:border-primary hover:bg-primary-light/30 transition-all"
          >
            <span class="text-sm text-text-primary">{{ suggestion }}</span>
          </button>
        </div>
        
        <button
          @click="startChat"
          class="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:opacity-90 transition-all"
        >
          开始对话
        </button>
      </div>
    </div>

    <!-- Main Chat Interface -->
    <template v-else>
      <!-- Header -->
      <div class="model-bar px-4 py-3 border-b border-border bg-background-secondary">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h1 class="text-base font-semibold text-text-primary">
              {{ activeConversation?.title || '新对话' }}
            </h1>
            <span v-if="activeConversation" class="text-xs text-text-tertiary">
              {{ messages.length }} 条消息
            </span>
          </div>
          
          <div class="flex items-center gap-2">
            <!-- Model Selector -->
            <div class="relative">
              <button
                class="model-selector flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background-primary text-sm"
                @click="showModelSelector = !showModelSelector"
              >
                <Sparkles :size="14" class="text-primary" />
                <span class="text-text-primary">{{ activeModel?.name || '选择模型' }}</span>
                <ChevronDown :size="14" class="text-text-tertiary" />
              </button>

              <Transition
                enter-active-class="animate-fade-in"
                leave-active-class="animate-fade-out"
              >
                <div v-if="showModelSelector" class="model-dropdown">
                  <div class="dropdown-header">
                    <HardDrive :size="14" />
                    <span>可用模型</span>
                  </div>
                  <div class="dropdown-list">
                    <button
                      v-for="model in conversationStore.models"
                      :key="model.id"
                      class="model-option"
                      :class="{ active: model.id === conversationStore.activeModelId }"
                      @click="handleModelSelect(model.id)"
                    >
                      <div class="model-info">
                        <span class="model-name">{{ model.name }}</span>
                        <span class="model-provider">{{ model.provider }}</span>
                      </div>
                      <Check v-if="model.id === conversationStore.activeModelId" :size="14" class="text-primary" />
                    </button>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Tools Menu -->
            <div class="relative">
              <button
                class="tools-btn flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm"
                :class="showToolsMenu ? 'bg-primary text-white border-primary' : 'bg-background-primary text-text-primary'"
                @click="showToolsMenu = !showToolsMenu"
              >
                <Settings :size="14" />
                <span>工具</span>
                <ChevronDown :size="14" />
              </button>

              <Transition
                enter-active-class="animate-fade-in"
                leave-active-class="animate-fade-out"
              >
                <div v-if="showToolsMenu" class="tools-dropdown">
                  <div class="p-2 grid grid-cols-2 gap-2">
                    <button
                      @click="compactMode = !compactMode"
                      class="tool-option"
                      :class="{ active: compactMode }"
                    >
                      <Square :size="18" />
                      <span>简洁模式</span>
                    </button>
                    <button
                      @click="showWelcome = true; showToolsMenu = false"
                      class="tool-option"
                    >
                      <Eye :size="18" />
                      <span>欢迎页</span>
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages Area -->
      <div ref="messagesContainer" class="messages-area flex-1 overflow-y-auto">
        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-icon">
            <Bot :size="48" />
          </div>
          <h2>开始对话</h2>
          <p>选择一个模型，然后输入您的问题开始对话</p>
          <div class="suggestions">
            <button
              v-for="s in ['解释量子计算的原理', '用Python实现排序算法', '设计一个REST API']"
              :key="s"
              @click="inputText = s"
              class="suggestion-btn"
            >
              {{ s }}
            </button>
          </div>
        </div>

        <div v-else class="messages-list">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="message.role"
          >
            <div class="message-avatar">
              <User v-if="message.role === 'user'" :size="20" />
              <Bot v-else :size="20" />
            </div>
            
            <div class="message-content">
              <div class="message-header">
                <span class="message-role">
                  {{ message.role === 'user' ? '你' : (message.model_name || 'AI助手') }}
                </span>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>
              
              <!-- Images -->
              <div v-if="message.images && message.images.length > 0" class="message-images">
                <img
                  v-for="(img, idx) in message.images"
                  :key="idx"
                  :src="img"
                  class="message-image"
                />
              </div>
              
              <div class="message-text" v-html="message.content.replace(/\n/g, '<br>')"></div>
              
              <div v-if="message.role === 'assistant'" class="message-actions">
                <button @click="handleCopy(message.content)" title="复制">
                  <Copy :size="14" />
                </button>
                <button @click="handleRegenerate" title="重新生成">
                  <RotateCcw :size="14" />
                </button>
                <button title="有用">
                  <ThumbsUp :size="14" />
                </button>
                <button title="没用">
                  <ThumbsDown :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <div class="input-container">
          <!-- Image Preview -->
          <div v-if="uploadedImages.length > 0" class="image-preview">
            <div v-for="img in uploadedImages" :key="img.id" class="preview-item">
              <img :src="img.preview" class="preview-image" />
              <button @click="handleRemoveImage(img.id)" class="remove-btn">
                <X :size="12" />
              </button>
            </div>
            <button @click="handleImageUpload" class="add-image-btn">
              <Plus :size="14" />
              添加
            </button>
          </div>

          <div class="input-row">
            <button @click="handleImageUpload" class="upload-btn" title="上传图片">
              <Image :size="18" :class="{ 'text-primary': uploadedImages.length > 0 }" />
            </button>
            
            <textarea
              v-model="inputText"
              @keydown="handleKeydown"
              :placeholder="uploadedImages.length > 0 ? '描述图片内容或输入问题...' : '输入消息... (Enter发送, Shift+Enter换行)'"
              rows="1"
              class="input-textarea"
            ></textarea>

            <button
              v-if="isStreaming"
              @click="handleStopStreaming"
              class="stop-btn"
              title="停止生成"
            >
              <Square :size="16" />
            </button>
            <button
              v-else
              @click="handleSend"
              :disabled="!inputText.trim() && uploadedImages.length === 0"
              class="send-btn"
              title="发送"
            >
              <Send :size="16" />
            </button>
          </div>
        </div>

        <div class="input-footer">
          <span v-if="!activeModel" class="warning">请先选择模型</span>
          <span v-else class="info">{{ activeModel.name }} · 按 Enter 发送</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.chat-view {
  background-color: var(--bg-primary);
  position: relative;
}

.chat-view.compact-mode {
  background-color: transparent;
}

.model-bar {
  height: 56px;
}

.model-selector {
  transition: all 0.2s ease;
}

.model-selector:hover {
  border-color: var(--primary-color);
}

.model-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 100;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
}

.dropdown-list {
  max-height: 300px;
  overflow-y: auto;
}

.model-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.model-option:hover {
  background-color: var(--bg-tertiary);
}

.model-option.active {
  background-color: var(--primary-light);
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.model-provider {
  font-size: 12px;
  color: var(--text-tertiary);
}

.tools-btn {
  transition: all 0.2s ease;
}

.tools-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 100;
}

.tool-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tool-option:hover {
  border-color: var(--primary-color);
}

.tool-option.active {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.messages-area {
  padding: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--text-tertiary);
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: var(--bg-tertiary);
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  margin-bottom: 24px;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.suggestion-btn {
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.suggestion-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.message {
  display: flex;
  gap: 12px;
}

.message-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background-color: var(--primary-light);
  color: var(--primary-color);
}

.message.assistant .message-avatar {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
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
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
  word-break: break-word;
}

.message-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message:hover .message-actions {
  opacity: 1;
}

.message-actions button {
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

.message-actions button:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
}

.input-area {
  padding: 12px 16px 16px;
  border-top: 1px solid var(--border-light);
  background-color: var(--bg-secondary);
}

.input-container {
  max-width: 800px;
  margin: 0 auto;
}

.image-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.preview-item {
  position: relative;
}

.preview-image {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
}

.remove-btn {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #ef4444;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.preview-item:hover .remove-btn {
  opacity: 1;
}

.add-image-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  height: 64px;
  border-radius: 8px;
  border: 1px solid var(--primary-color);
  background-color: var(--primary-light);
  color: var(--primary-color);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-image-btn:hover {
  opacity: 0.9;
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  transition: border-color 0.2s ease;
}

.input-row:focus-within {
  border-color: var(--primary-color);
}

.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.upload-btn:hover {
  background-color: var(--bg-tertiary);
}

.input-textarea {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  max-height: 128px;
  min-height: 24px;
}

.input-textarea::placeholder {
  color: var(--text-tertiary);
}

.send-btn,
.stop-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-btn {
  background-color: var(--primary-color);
  color: white;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.send-btn:disabled {
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.stop-btn {
  background-color: #ef4444;
  color: white;
}

.stop-btn:hover {
  opacity: 0.9;
}

.input-footer {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.input-footer .warning {
  font-size: 12px;
  color: #ef4444;
}

.input-footer .info {
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
