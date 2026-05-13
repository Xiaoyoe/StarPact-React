<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Activity, Brain, MessageCircle, Image as ImageIcon, AlertTriangle, Settings2, X, EyeOff, Navigation, PowerOff } from 'lucide-vue-next';
import { useConversationStore, useModelStore } from '@/stores';
import { useToast } from '@/composables/useToast';

interface Props {
  isOpen: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  toggle: [];
}>();

const conversationStore = useConversationStore();
const modelStore = useModelStore();
const toast = useToast();
const containerRef = ref<HTMLElement | null>(null);

const handleStopModel = async () => {
  const activeModel = modelStore.activeModel;
  if (!activeModel) {
    toast.warning('没有活动的模型');
    return;
  }
  
  try {
    if (activeModel.type === 'local') {
      const provider = (activeModel.localProvider || activeModel.provider).toLowerCase();
      
      if (provider === 'ollama') {
        const host = activeModel.localServiceConfig?.host || 'localhost';
        const port = activeModel.localServiceConfig?.port || 11434;
        await modelStore.stopOllamaModel(activeModel.model, host, port);
        toast.success(`已停止模型 ${activeModel.name}`);
      } else if (provider === 'lmstudio') {
        toast.info('LM Studio 模型请在 LM Studio 中手动卸载');
      }
    } else {
      toast.info('远程模型无需停止');
    }
  } catch (error) {
    toast.error('停止模型失败');
  }
};

const controls = computed(() => [
    {
      id: 'deleteConfirm',
      icon: AlertTriangle,
      label: '删除确认',
      checked: conversationStore.deleteConfirmEnabled,
      onChange: () => {
        const newValue = !conversationStore.deleteConfirmEnabled;
        conversationStore.setDeleteConfirmEnabled(newValue);
        toast.info(newValue ? '已开启删除确认' : '已关闭删除确认');
      },
    },
    {
      id: 'autoHideInput',
      icon: EyeOff,
      label: '自动隐藏输入框',
      checked: conversationStore.autoHideInputEnabled,
      onChange: () => {
        const newValue = !conversationStore.autoHideInputEnabled;
        conversationStore.setAutoHideInputEnabled(newValue);
        toast.info(newValue ? '已开启自动隐藏' : '已关闭自动隐藏');
      },
    },
    {
      id: 'verboseMode',
      icon: Activity,
      label: '详细模式',
      checked: conversationStore.ollamaVerboseMode,
      onChange: () => {
        const newValue = !conversationStore.ollamaVerboseMode;
        conversationStore.setOllamaVerboseMode(newValue);
        toast.info(newValue ? '已开启详细模式' : '已关闭详细模式');
      },
    },
    {
      id: 'thinkMode',
      icon: Brain,
      label: '思考模式',
      checked: conversationStore.ollamaThinkMode,
      onChange: () => {
        const newValue = !conversationStore.ollamaThinkMode;
        conversationStore.setOllamaThinkMode(newValue);
        toast.info(newValue ? '已开启思考模式' : '已关闭思考模式');
      },
    },
    {
      id: 'includeImages',
      icon: ImageIcon,
      label: '图片上下文',
      checked: conversationStore.includeImagesInContext,
      onChange: () => {
        const newValue = !conversationStore.includeImagesInContext;
        conversationStore.setIncludeImagesInContext(newValue);
        toast.info(newValue ? '已开启图片上下文' : '已关闭图片上下文');
      },
    },
    {
      id: 'showNavigationDots',
      icon: Navigation,
      label: '导航点',
      checked: conversationStore.showNavigationDots,
      onChange: () => {
        const newValue = !conversationStore.showNavigationDots;
        conversationStore.setShowNavigationDots(newValue);
        toast.info(newValue ? '已显示导航点' : '已隐藏导航点');
      },
    },
  ]);

const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    emit('close');
  }
};

onMounted(() => {
  if (props.isOpen) {
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
  }
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<template>
  <div class="relative" ref="containerRef">
    <button
      @click="emit('toggle')"
      class="control-btn"
      :class="{ 'is-open': isOpen }"
      title="聊天控制"
    >
      <Settings2 :size="18" />
    </button>

    <Transition name="panel">
      <div v-if="isOpen" class="control-panel">
        <div class="panel-header">
          <span class="panel-title">聊天控制</span>
          <button
            @click="emit('close')"
            class="close-btn"
          >
            <X :size="14" />
          </button>
        </div>

        <div class="panel-content">
          <div
            v-for="control in controls"
            :key="control.id"
            class="control-item"
            :class="{ 'is-active': control.checked }"
            @click="control.onChange"
          >
            <div class="control-left">
              <div class="control-icon" :class="{ 'is-active': control.checked }">
                <component :is="control.icon" :size="14" />
              </div>
              <span class="control-label" :class="{ 'is-active': control.checked }">
                {{ control.label }}
              </span>
            </div>
            <div class="toggle-switch" :class="{ 'is-active': control.checked }">
              <div class="toggle-thumb"></div>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <button 
            v-if="modelStore.activeModel?.type === 'local'"
            class="stop-model-btn"
            @click="handleStopModel"
          >
            <PowerOff :size="14" />
            <span>停止当前模型</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  color: var(--text-tertiary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.control-btn:hover {
  transform: scale(1.1);
}

.control-btn.is-open {
  background-color: var(--primary-color);
  color: white;
}

.control-panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 220px;
  border-radius: 16px;
  overflow: hidden;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 1000;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background-color: var(--bg-secondary);
  transform: scale(1.1);
}

.panel-content {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.control-item:hover {
  transform: scale(1.02);
}

.control-item:active {
  transform: scale(0.98);
}

.control-item.is-active {
  background-color: var(--primary-light);
}

.control-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  transition: all 0.2s ease;
}

.control-icon.is-active {
  background-color: var(--primary-color);
  color: white;
}

.control-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  transition: color 0.2s ease;
}

.control-label.is-active {
  color: var(--primary-color);
}

.toggle-switch {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background-color: var(--bg-tertiary);
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.toggle-switch.is-active {
  background-color: var(--primary-color);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.toggle-switch.is-active .toggle-thumb {
  transform: translateX(16px);
}

.panel-enter-active,
.panel-leave-active {
  transition: all 0.2s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

.divider {
  height: 1px;
  background: var(--border-color);
  margin: 8px 12px;
}

.stop-model-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.stop-model-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
}
</style>
