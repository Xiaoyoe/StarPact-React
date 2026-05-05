<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useModelStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import { Plus, Star, Trash2, Settings2 } from 'lucide-vue-next';

const modelStore = useModelStore();
const toast = useToast();

const searchQuery = ref('');
const showAddModal = ref(false);

const filteredModels = computed(() => {
  if (!searchQuery.value) return modelStore.models;
  return modelStore.models.filter(m =>
    m.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    m.provider.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const handleAddModel = async (model: any) => {
  await modelStore.addModel(model);
  toast.success('模型添加成功');
  showAddModal.value = false;
};

const handleDeleteModel = async (id: string) => {
  if (confirm('确定要删除这个模型吗？')) {
    await modelStore.deleteModel(id);
    toast.success('模型已删除');
  }
};

const handleSetActive = (id: string) => {
  modelStore.setActiveModel(id);
  toast.success('已切换模型');
};

const handleToggleFavorite = (id: string) => {
  modelStore.toggleFavorite(id);
};

onMounted(() => {
  modelStore.loadModels();
});
</script>

<template>
  <div class="models-page">
    <div class="page-header">
      <h1>模型管理</h1>
      <Button variant="primary" @click="showAddModal = true">
        <Plus :size="18" />
        添加模型
      </Button>
    </div>

    <div class="search-bar">
      <Input
        v-model="searchQuery"
        placeholder="搜索模型..."
      />
    </div>

    <div class="models-grid">
      <div
        v-for="model in filteredModels"
        :key="model.id"
        class="model-card"
        :class="{ active: model.id === modelStore.activeModelId }"
      >
        <div class="model-header">
          <div class="model-info">
            <h3 class="model-name">{{ model.name }}</h3>
            <span class="model-provider">{{ model.provider }}</span>
          </div>
          <div class="model-actions">
            <button
              class="action-btn"
              :class="{ active: model.isFavorite }"
              @click="handleToggleFavorite(model.id)"
            >
              <Star :size="16" />
            </button>
            <button class="action-btn" @click="handleDeleteModel(model.id)">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>

        <div class="model-details">
          <div class="detail-item">
            <span class="label">类型:</span>
            <span class="value">{{ model.type === 'local' ? '本地' : '远程' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">模型:</span>
            <span class="value">{{ model.model }}</span>
          </div>
          <div class="detail-item">
            <span class="label">温度:</span>
            <span class="value">{{ model.temperature }}</span>
          </div>
        </div>

        <div class="model-footer">
          <Button
            v-if="model.id !== modelStore.activeModelId"
            variant="secondary"
            size="sm"
            @click="handleSetActive(model.id)"
          >
            使用此模型
          </Button>
          <span v-else class="active-label">当前使用</span>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click="showAddModal = false">
      <div class="modal" @click.stop>
        <h2>添加新模型</h2>
        <p class="modal-desc">模型配置表单将在这里实现</p>
        <div class="modal-actions">
          <Button variant="secondary" @click="showAddModal = false">取消</Button>
          <Button variant="primary" @click="handleAddModel({})">添加</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.models-page {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.search-bar {
  margin-bottom: 24px;
  max-width: 400px;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.model-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
}

.model-card:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-md);
}

.model-card.active {
  border-color: var(--primary-color);
  background-color: rgba(59, 130, 246, 0.05);
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.model-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.model-provider {
  font-size: 12px;
  color: var(--text-secondary);
}

.model-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: var(--hover-bg);
  color: var(--text-primary);
}

.action-btn.active {
  color: #f59e0b;
}

.model-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.detail-item .label {
  color: var(--text-secondary);
}

.detail-item .value {
  color: var(--text-primary);
}

.model-footer {
  display: flex;
  justify-content: flex-end;
}

.active-label {
  font-size: 13px;
  color: var(--primary-color);
  font-weight: 500;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--bg-primary);
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 500px;
  border: 1px solid var(--border-color);
}

.modal h2 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.modal-desc {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
