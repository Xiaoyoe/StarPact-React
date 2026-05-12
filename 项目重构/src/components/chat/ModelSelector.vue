<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronDown, Bot, Check } from 'lucide-vue-next';
import { useConversationStore } from '@/stores';
import { useToast } from '@/composables/useToast';

const conversationStore = useConversationStore();
const toast = useToast();

const isOpen = ref(false);

const groupedModels = computed(() => {
  const groups: Record<string, typeof conversationStore.models> = {};
  
  conversationStore.models.forEach(model => {
    const group = model.group || 'default';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(model);
  });
  
  return groups;
});

const handleSelectModel = (modelId: string) => {
  conversationStore.setActiveModel(modelId);
  isOpen.value = false;
  
  const model = conversationStore.models.find(m => m.id === modelId);
  if (model) {
    toast.success(`已选择模型: ${model.name}`);
  }
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.model-selector')) {
    isOpen.value = false;
  }
};

if (typeof window !== 'undefined') {
  document.addEventListener('click', handleClickOutside);
}
</script>

<template>
  <div class="model-selector" @click.stop>
    <button
      class="selector-btn"
      :class="{ 'is-open': isOpen, 'no-model': !conversationStore.activeModel }"
      @click="isOpen = !isOpen"
    >
      <Bot :size="16" />
      <span class="selector-text">
        {{ conversationStore.activeModel?.name || '选择模型' }}
      </span>
      <ChevronDown :size="14" :class="{ rotated: isOpen }" />
    </button>

    <Transition name="dropdown">
      <div v-if="isOpen" class="dropdown">
        <div v-if="conversationStore.models.length === 0" class="empty-state">
          <p>暂无可用模型</p>
          <p class="hint">请先在模型管理页面添加模型</p>
        </div>

        <div v-else class="model-groups">
          <div
            v-for="(models, groupName) in groupedModels"
            :key="groupName"
            class="model-group"
          >
            <div class="group-title">{{ groupName }}</div>
            <button
              v-for="model in models"
              :key="model.id"
              class="model-option"
              :class="{ active: model.id === conversationStore.activeModelId }"
              @click="handleSelectModel(model.id)"
            >
              <div class="model-info">
                <div class="model-name">{{ model.name }}</div>
                <div class="model-provider">{{ model.provider }}</div>
              </div>
              <Check v-if="model.id === conversationStore.activeModelId" :size="16" class="check-icon" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.model-selector {
  position: relative;
}

.selector-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 150px;
}

.selector-btn:hover {
  background-color: var(--bg-tertiary);
}

.selector-btn.is-open {
  background-color: var(--bg-tertiary);
  border-color: var(--primary-color);
}

.selector-btn.no-model {
  color: var(--text-tertiary);
}

.selector-text {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rotated {
  transform: rotate(180deg);
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  max-height: 400px;
  overflow-y: auto;
  z-index: 100;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--text-tertiary);
}

.empty-state p {
  margin: 4px 0;
}

.empty-state .hint {
  font-size: 12px;
  opacity: 0.7;
}

.model-groups {
  padding: 8px;
}

.model-group {
  margin-bottom: 8px;
}

.model-group:last-child {
  margin-bottom: 0;
}

.group-title {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.model-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.model-option:hover {
  background-color: var(--bg-secondary);
}

.model-option.active {
  background-color: var(--primary-light);
}

.model-info {
  flex: 1;
  min-width: 0;
}

.model-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.model-option.active .model-name {
  color: var(--primary-color);
}

.model-provider {
  font-size: 11px;
  color: var(--text-tertiary);
}

.check-icon {
  color: var(--primary-color);
  flex-shrink: 0;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
