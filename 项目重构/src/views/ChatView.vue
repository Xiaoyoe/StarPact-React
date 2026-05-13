<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { 
  Send, Paperclip, Image as ImageIcon, X, 
  Menu, MoreVertical, Edit2, Trash2, 
  MessageSquare, Settings, ChevronDown,
  ChevronRight, PanelRightClose, ChevronLeft,
  Pencil, Check, Square, Database, Brain,
  Activity, EyeOff
} from 'lucide-vue-next';
import { useConversationStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import { chatService, type CompletionStats } from '@/services/chatService';
import ChatWelcome from '@/components/chat/ChatWelcome.vue';
import ChatControlPanel from '@/components/chat/ChatControlPanel.vue';
import MessageBubble from '@/components/chat/MessageBubble.vue';
import PerformancePanel from '@/components/chat/PerformancePanel.vue';
import ModelSelector from '@/components/chat/ModelSelector.vue';
import ConversationList from '@/components/chat/ConversationList.vue';
import ChatQuickNav from '@/components/chat/ChatQuickNav.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import ImageViewer from '@/components/common/ImageViewer.vue';
import type { ChatMessage } from '@/stores/useConversationStore';

const conversationStore = useConversationStore();
const toast = useToast();

const inputText = ref('');
const selectedImages = ref<string[]>([]);
const isStreaming = ref(false);
const streamingContent = ref('');
const streamingThinking = ref('');
const showControlPanel = ref(false);
const showPerformance = ref(false);
const showConfirmDialog = ref(false);
const messageToDelete = ref<string | null>(null);
const editingTitle = ref(false);
const titleInput = ref('');
const headerVisible = ref(true);
const inputVisible = ref(true);
const isInputFocused = ref(false);
let hideInputTimer: ReturnType<typeof setTimeout> | null = null;

const messagesContainer = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const viewerImages = ref<string[]>([]);
const viewerIndex = ref(0);
const viewerOpen = ref(false);

const performanceData = ref<CompletionStats>({
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  responseTime: 0,
});

const hasMessages = computed(() => {
  return conversationStore.activeConversation && 
         conversationStore.activeConversation.messages.length > 0;
});

const shouldShowWelcome = computed(() => {
  return false;
});

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const handleStartChat = async () => {
  if (!conversationStore.activeConversation) {
    const result = await conversationStore.createNewConversation();
    if (!result) {
      toast.error('创建会话失败');
    }
  }
};

const handleSuggestionClick = async (text: string) => {
  await handleStartChat();
  inputText.value = text;
  await handleSend();
};

const handleImageSelect = () => {
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files) return;

  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          selectedImages.value.push(result);
        }
      };
      reader.readAsDataURL(file);
    }
  });

  target.value = '';
};

const removeImage = (index: number) => {
  selectedImages.value.splice(index, 1);
};

const viewSelectedImage = (index: number) => {
  viewerImages.value = selectedImages.value;
  viewerIndex.value = index;
  viewerOpen.value = true;
};

const handleSend = async () => {
  resetHideInputTimer();
  console.log('handleSend called', {
    inputText: inputText.value,
    selectedImages: selectedImages.value.length,
    activeConversation: conversationStore.activeConversation,
    activeConversationId: conversationStore.activeConversationId,
  });
  
  if (!inputText.value.trim() && selectedImages.value.length === 0) {
    toast.warning('请输入消息或选择图片');
    return;
  }
  
  // 确保有会话
  if (!conversationStore.activeConversation) {
    console.log('No active conversation, creating one...');
    await handleStartChat();
    if (!conversationStore.activeConversation) {
      console.error('Failed to create conversation');
      toast.error('创建会话失败');
      return;
    }
  }

  const userMessage: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role: 'user',
    content: inputText.value.trim(),
    timestamp: Date.now(),
    images: selectedImages.value.length > 0 ? [...selectedImages.value] : undefined,
  };

  console.log('Adding user message:', userMessage);

  const success = await conversationStore.addMessage(
    conversationStore.activeConversationId!,
    userMessage
  );
  
  console.log('Add message result:', success);
  
  if (!success) {
    toast.error('发送消息失败');
    return;
  }

  const currentInput = inputText.value;
  const currentImages = [...selectedImages.value];
  inputText.value = '';
  selectedImages.value = [];

  await scrollToBottom();

  // 如果没有模型，显示提示气泡
  if (!conversationStore.activeModel) {
    console.log('No active model, showing no model message');
    await showNoModelMessage();
    return;
  }

  await generateResponse(currentInput, currentImages);
};

const generateResponse = async (userInput: string, images: string[] = []) => {
  if (!conversationStore.activeModel || !conversationStore.activeConversation) {
    toast.error('模型或会话未初始化');
    return;
  }

  isStreaming.value = true;
  streamingContent.value = '';
  streamingThinking.value = '';

  const assistantMessage: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    modelId: conversationStore.activeModelId!,
    modelName: conversationStore.activeModel.name,
    isStreaming: true,
  };

  await conversationStore.addMessage(
    conversationStore.activeConversationId!,
    assistantMessage
  );

  const messages = buildMessageHistory();

  try {
    await chatService.streamChat(
      {
        model: conversationStore.activeModel,
        messages,
        thinkMode: conversationStore.ollamaThinkMode,
        verbose: conversationStore.ollamaVerboseMode,
        images: images.length > 0 ? images : undefined,
      },
      {
        onToken: (token) => {
          streamingContent.value += token;
          scrollToBottom();
        },
        onThinking: (thinking) => {
          streamingThinking.value = thinking;
        },
        onComplete: (stats) => {
          performanceData.value = stats;
          showPerformance.value = conversationStore.ollamaVerboseMode;
          
          conversationStore.updateMessage(
            conversationStore.activeConversationId!,
            assistantMessage.id,
            {
              content: streamingContent.value,
              thinking: streamingThinking.value || undefined,
              thinkingDuration: stats.thinkingTime,
              isStreaming: false,
            }
          );

          isStreaming.value = false;
          streamingContent.value = '';
          streamingThinking.value = '';
        },
        onError: (error) => {
          toast.error(`生成失败: ${error}`);
          conversationStore.deleteMessage(
            conversationStore.activeConversationId!,
            assistantMessage.id
          );
          isStreaming.value = false;
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    toast.error(`请求失败: ${errorMessage}`);
    conversationStore.deleteMessage(
      conversationStore.activeConversationId!,
      assistantMessage.id
    );
    isStreaming.value = false;
  }
};

const showNoModelMessage = async () => {
  if (!conversationStore.activeConversation) return;

  const assistantMessage: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role: 'assistant',
    content: '💡 提示\n\n当前未配置模型，您的消息已保存。\n\n请前往"模型管理"页面添加模型配置，然后继续对话。\n\n✅ 聊天功能正常工作',
    timestamp: Date.now(),
    modelName: '系统提示',
  };

  await conversationStore.addMessage(
    conversationStore.activeConversationId!,
    assistantMessage
  );

  await scrollToBottom();
};

const buildMessageHistory = (): ChatMessage[] => {
  if (!conversationStore.activeConversation) return [];

  if (conversationStore.ollamaChatMode === 'single') {
    const lastUserMessage = [...conversationStore.activeConversation.messages]
      .reverse()
      .find(m => m.role === 'user');
    return lastUserMessage ? [lastUserMessage] : [];
  }

  return conversationStore.activeConversation.messages.filter(m => !m.isStreaming);
};

const handleImageClick = (images: string[], index: number) => {
  viewerImages.value = images;
  viewerIndex.value = index;
  viewerOpen.value = true;
};

const handleRegenerate = async (content: string, images?: string[]) => {
  await generateResponse(content, images);
};

const handleDeleteRequest = (messageId: string) => {
  if (conversationStore.deleteConfirmEnabled) {
    messageToDelete.value = messageId;
    showConfirmDialog.value = true;
  } else {
    handleDeleteConfirm();
  }
};

const handleDeleteConfirm = async () => {
  if (!messageToDelete.value || !conversationStore.activeConversationId) return;

  const success = await conversationStore.deleteMessage(
    conversationStore.activeConversationId,
    messageToDelete.value
  );

  if (success) {
    toast.success('消息已删除');
  } else {
    toast.error('删除失败');
  }

  showConfirmDialog.value = false;
  messageToDelete.value = null;
};

const handleTitleEdit = () => {
  if (!conversationStore.activeConversation) return;
  editingTitle.value = true;
  titleInput.value = conversationStore.activeConversation.title;
};

const handleTitleSave = async () => {
  if (!conversationStore.activeConversationId || !titleInput.value.trim()) return;

  const success = await conversationStore.updateConversation(
    conversationStore.activeConversationId,
    { title: titleInput.value.trim() }
  );

  if (success) {
    toast.success('标题已更新');
  } else {
    toast.error('更新失败');
  }

  editingTitle.value = false;
};

const handleTitleCancel = () => {
  editingTitle.value = false;
  titleInput.value = '';
};

const formatTokens = (tokens: number): string => {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
};

const handleKeyDown = (e: KeyboardEvent) => {
  resetHideInputTimer();
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const startHideInputTimer = () => {
  if (!conversationStore.autoHideInputEnabled) return;
  if (isInputFocused.value) return;
  if (hideInputTimer) clearTimeout(hideInputTimer);
  hideInputTimer = setTimeout(() => {
    if (!isInputFocused.value) {
      inputVisible.value = false;
    }
  }, 3000);
};

const showInputManually = () => {
  inputVisible.value = true;
  if (conversationStore.autoHideInputEnabled) {
    startHideInputTimer();
  }
};

const resetHideInputTimer = (event?: MouseEvent) => {
  if (!conversationStore.autoHideInputEnabled) return;
  if (isInputFocused.value) return;
  
  if (!inputVisible.value) {
    inputVisible.value = true;
  }
  
  if (hideInputTimer) clearTimeout(hideInputTimer);
  hideInputTimer = setTimeout(() => {
    if (!isInputFocused.value && conversationStore.autoHideInputEnabled) {
      inputVisible.value = false;
    }
  }, 3000);
};

const handleInputFocus = () => {
  isInputFocused.value = true;
  if (hideInputTimer) clearTimeout(hideInputTimer);
  if (!inputVisible.value) {
    inputVisible.value = true;
  }
};

const handleInputBlur = () => {
  isInputFocused.value = false;
  if (conversationStore.autoHideInputEnabled) {
    startHideInputTimer();
  }
};

watch(() => conversationStore.activeConversation?.messages.length, () => {
  scrollToBottom();
});

watch(() => conversationStore.autoHideInputEnabled, (enabled) => {
  if (!enabled) {
    if (hideInputTimer) clearTimeout(hideInputTimer);
    inputVisible.value = true;
  } else {
    startHideInputTimer();
  }
});

onMounted(async () => {
  try {
    await conversationStore.loadModels();
    await conversationStore.loadConversations();
    
    if (conversationStore.conversations.length > 0) {
      const latestConversation = conversationStore.conversations[0];
      if (!conversationStore.activeConversationId) {
        conversationStore.activeConversationId = latestConversation.id;
      }
    } else {
      await conversationStore.createNewConversation();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    toast.error(`加载数据失败: ${errorMessage}`);
  }
  
  if (conversationStore.autoHideInputEnabled) {
    startHideInputTimer();
  }
});

onUnmounted(() => {
  if (hideInputTimer) clearTimeout(hideInputTimer);
});
</script>

<template>
  <div class="chat-view">
    <div class="chat-content">
      <ChatWelcome
        v-if="shouldShowWelcome"
        @start-chat="handleStartChat"
        @suggestion-click="handleSuggestionClick"
      />

      <div v-else ref="messagesContainer" class="messages-wrapper">
        <div class="messages-container">
          <div
            v-for="(message, index) in conversationStore.activeConversation?.messages"
            :key="message.id"
            :data-message-id="message.id"
          >
            <MessageBubble
              :message="message"
              :is-last="index === (conversationStore.activeConversation?.messages.length || 0) - 1"
              :compact-mode="conversationStore.compactMode"
              :streaming-content="message.isStreaming ? streamingContent : undefined"
              :streaming-thinking="message.isStreaming ? streamingThinking : undefined"
              @image-click="handleImageClick"
              @regenerate="handleRegenerate"
              @delete="handleDeleteRequest"
            />
          </div>
        </div>

        <ChatQuickNav
          :messages="conversationStore.activeConversation?.messages || []"
          :container-ref="messagesContainer"
        />
      </div>

      <PerformancePanel
        v-if="showPerformance && hasMessages"
        :data="performanceData"
        :is-visible="showPerformance"
      />
    </div>

    <div class="chat-header-area" :class="{ hidden: !headerVisible }">
      <div class="chat-header">
        <div class="header-left">
          <div v-if="conversationStore.activeConversation" class="title-section">
            <div v-if="editingTitle" class="title-edit-container">
              <input
                v-model="titleInput"
                class="title-input"
                placeholder="输入标题..."
                autofocus
              />
              <button class="icon-btn-sm" title="确认" @click="handleTitleSave">
                <Check :size="14" />
              </button>
              <button class="icon-btn-sm cancel" title="取消" @click="handleTitleCancel">
                <Square :size="14" />
              </button>
            </div>
            
            <template v-else>
              <button class="icon-btn edit-title-btn" title="编辑标题" @click="handleTitleEdit">
                <Pencil :size="14" />
              </button>
              
              <h2 class="title" @dblclick="handleTitleEdit">
                {{ conversationStore.activeConversation.title }}
              </h2>
              
              <span class="message-count">
                {{ conversationStore.activeConversation.messages.length }} 条消息
              </span>
              
              <span v-if="conversationStore.activeConversation?.totalTokens && conversationStore.activeConversation.totalTokens > 0" class="tag token-tag">
                <Database :size="11" />
                <span>{{ formatTokens(conversationStore.activeConversation.totalTokens) }}</span>
              </span>
              
              <span v-if="conversationStore.ollamaVerboseMode" class="tag verbose-tag">
                <Activity :size="11" />
                <span>详细</span>
              </span>
              
              <span v-if="conversationStore.ollamaThinkMode" class="tag think-tag">
                <Brain :size="11" />
                <span>思考</span>
              </span>
              
              <span v-if="conversationStore.autoHideInputEnabled" class="tag auto-hide-tag">
                <EyeOff :size="11" />
                <span>自动隐藏</span>
              </span>
              
              <span class="tag mode-tag">
                <MessageSquare :size="11" />
                <span>{{ conversationStore.ollamaChatMode === 'multi' ? '多轮' : '单轮' }}</span>
              </span>
              
              <span v-if="conversationStore.includeImagesInContext" class="tag image-tag">
                <ImageIcon :size="11" />
                <span>带图</span>
              </span>
            </template>
          </div>
        </div>

        <div class="header-right">
          <ModelSelector />

          <ChatControlPanel
            :is-open="showControlPanel"
            @toggle="showControlPanel = !showControlPanel"
            @close="showControlPanel = false"
          />

          <button class="icon-btn" @click="showPerformance = !showPerformance" title="性能监控">
            <Settings :size="20" />
          </button>

          <button class="icon-btn toggle-header-btn" @click="headerVisible = !headerVisible" :title="headerVisible ? '隐藏标题栏' : '显示标题栏'">
            <PanelRightClose v-if="headerVisible" :size="18" />
            <ChevronRight v-else :size="18" />
          </button>
        </div>
      </div>
    </div>

    <button 
      v-if="!headerVisible" 
      class="show-header-btn"
      @click="headerVisible = true"
      title="显示标题栏"
    >
      <ChevronLeft :size="18" />
    </button>

    <div class="chat-input-area" :class="{ hidden: !inputVisible }">
      <div v-if="selectedImages.length > 0" class="selected-images">
        <div
          v-for="(img, index) in selectedImages"
          :key="index"
          class="image-preview"
          @click="viewSelectedImage(index)"
        >
          <img :src="img" :alt="`图片 ${index + 1}`" />
          <button class="remove-image" @click.stop="removeImage(index)">
            <X :size="14" />
          </button>
        </div>
      </div>

      <div class="input-container" @focusin="handleInputFocus" @focusout="handleInputBlur">
        <button class="icon-btn" @click="handleImageSelect" title="添加图片">
          <ImageIcon :size="20" />
        </button>

        <textarea
          v-model="inputText"
          class="message-input"
          placeholder="输入消息... (Shift+Enter 换行)"
          @keydown="handleKeyDown"
          @focus="handleInputFocus"
          :disabled="isStreaming"
          rows="1"
        ></textarea>

        <button
          class="send-btn"
          @click="handleSend"
          :disabled="(!inputText.trim() && selectedImages.length === 0) || isStreaming"
        >
          <Send :size="20" />
        </button>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        style="display: none"
        @change="handleFileChange"
      />
    </div>

    <button 
      v-if="!inputVisible" 
      class="show-input-btn"
      @click="showInputManually"
      title="显示输入框"
    >
      <Send :size="18" />
    </button>

    <ConfirmDialog
      :is-open="showConfirmDialog"
      title="删除消息"
      message="确定要删除这条消息吗？此操作无法撤销。"
      confirm-text="删除"
      type="danger"
      @confirm="handleDeleteConfirm"
      @cancel="showConfirmDialog = false"
    />

    <ImageViewer
      :images="viewerImages"
      :current-index="viewerIndex"
      :is-open="viewerOpen"
      @close="viewerOpen = false"
      @prev="viewerIndex = Math.max(0, viewerIndex - 1)"
      @next="viewerIndex = Math.min(viewerImages.length - 1, viewerIndex + 1)"
      @jump-to="viewerIndex = $event"
    />
  </div>
</template>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 40px);
  max-height: 900px;
  background-color: transparent;
  position: relative;
  margin: 0 auto 20px;
  overflow: hidden;
}

.chat-header-area {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 100;
  pointer-events: none;
  transition: all 0.3s ease;
}

.chat-header-area.hidden {
  transform: translateY(-110%);
  opacity: 0;
}

.chat-header-area > * {
  pointer-events: auto;
}

.show-header-btn {
  position: absolute;
  top: 12px;
  right: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(var(--bg-primary-rgb, 255, 255, 255), 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(var(--border-color-rgb, 200, 200, 200), 0.3);
  color: var(--text-secondary);
  cursor: pointer;
  z-index: 101;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.show-header-btn:hover {
  color: var(--text-primary);
  border-color: var(--primary-color);
  transform: scale(1.05);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  background: rgba(var(--bg-primary-rgb, 255, 255, 255), 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  height: 60px;
  width: 100%;
  box-shadow: none;
  transition: all 0.3s ease;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-section {
  margin-left: 12px;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-input {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--primary-color);
  outline: none;
  padding: 4px 8px;
  width: 200px;
}

.title-edit-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-btn-sm {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background-color: var(--bg-secondary);
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn-sm:hover {
  background-color: var(--primary-color);
  color: white;
}

.icon-btn-sm.cancel:hover {
  background-color: #ef4444;
}

.edit-title-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.message-count {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: 8px;
  white-space: nowrap;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
}

.token-tag {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.verbose-tag {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.think-tag {
  background-color: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.auto-hide-tag {
  background-color: rgba(236, 72, 153, 0.1);
  color: #ec4899;
}

.mode-tag {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.image-tag {
  background-color: rgba(249, 115, 22, 0.1);
  color: #f97316;
}

.icon-btn {
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

.icon-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.toggle-header-btn {
  margin-left: 4px;
}

.toggle-header-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.chat-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.messages-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.messages-container {
  flex: 0 0 auto;
  padding: 96px 40px 140px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-input-area {
  position: absolute;
  bottom: 24px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 100;
  pointer-events: none;
  transition: all 0.3s ease;
}

.chat-input-area.hidden {
  transform: translateY(110%);
  opacity: 0;
}

.chat-input-area > * {
  pointer-events: auto;
}

.show-input-btn {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary-color);
  border: none;
  color: white;
  cursor: pointer;
  z-index: 101;
  box-shadow: 0 4px 20px rgba(6, 182, 212, 0.4);
  transition: all 0.2s ease;
}

.show-input-btn:hover {
  transform: translateX(-50%) scale(1.1);
  box-shadow: 0 6px 24px rgba(6, 182, 212, 0.5);
}

.selected-images {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  max-width: 1200px;
  width: 100%;
  padding: 0 20px;
}

.image-preview {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 10px;
  overflow: hidden;
  border: 1.5px solid rgba(var(--border-color-rgb, 200, 200, 200), 0.3);
  background: rgba(var(--bg-primary-rgb, 255, 255, 255), 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.2s ease;
}

.image-preview:hover {
  transform: scale(1.05);
  border-color: var(--primary-color);
  box-shadow: 0 4px 16px rgba(6, 182, 212, 0.25);
}

.image-preview:hover .remove-image {
  opacity: 1;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  opacity: 0.7;
}

.remove-image:hover {
  background: #dc2626;
  transform: scale(1.1);
  opacity: 1;
}

.input-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 20px;
  background: rgba(var(--bg-primary-rgb, 255, 255, 255), 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  max-width: 1200px;
  width: calc(100% - 40px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.input-container:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 3px rgba(6, 182, 212, 0.1);
}

.input-container .icon-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.message-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.5;
  resize: none;
  outline: none;
  min-height: 36px;
  max-height: 120px;
  font-family: inherit;
  padding: 8px 0;
}

.message-input::placeholder {
  color: var(--text-tertiary);
  opacity: 0.7;
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background-color: var(--primary-color);
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .messages-container {
    padding: 16px 20px;
  }
  
  .chat-header {
    padding: 10px 16px;
  }
  
  .input-container {
    width: calc(100% - 32px);
    padding: 10px 12px;
  }
  
  .selected-images {
    padding: 0 16px;
  }
}
</style>
