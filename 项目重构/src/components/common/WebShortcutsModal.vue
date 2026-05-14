<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useToast } from '@/composables/useToast';
import {
  Globe, Plus, Edit3, Trash2, ExternalLink, Search, X,
  Star, StarOff, Settings, GripVertical
} from 'lucide-vue-next';

const toast = useToast();

interface WebShortcut {
  id: string;
  name: string;
  url: string;
  icon?: string;
  category: string;
  isFavorite: boolean;
  createdAt: number;
  visitCount: number;
}

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'open-url', url: string): void;
}>();

const shortcuts = ref<WebShortcut[]>([]);
const searchQuery = ref('');
const showAddForm = ref(false);
const editingId = ref<string | null>(null);

const formData = ref({
  name: '',
  url: '',
  icon: '',
  category: 'tools',
});

const categories = [
  { id: 'tools', name: '工具', icon: '🔧' },
  { id: 'ai', name: 'AI', icon: '🤖' },
  { id: 'dev', name: '开发', icon: '💻' },
  { id: 'media', name: '媒体', icon: '🎬' },
  { id: 'other', name: '其他', icon: '📁' },
];

const generateId = () => `shortcut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const filteredShortcuts = computed(() => {
  if (!searchQuery.value) return shortcuts.value;
  const query = searchQuery.value.toLowerCase();
  return shortcuts.value.filter(s => 
    s.name.toLowerCase().includes(query) ||
    s.url.toLowerCase().includes(query)
  );
});

const favoriteShortcuts = computed(() => 
  shortcuts.value.filter(s => s.isFavorite)
);

const loadShortcuts = () => {
  try {
    const saved = localStorage.getItem('web_shortcuts');
    if (saved) {
      shortcuts.value = JSON.parse(saved);
    }
  } catch {
    // ignore
  }
};

const saveShortcuts = () => {
  localStorage.setItem('web_shortcuts', JSON.stringify(shortcuts.value));
};

const getFavicon = (url: string) => {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return null;
  }
};

const openUrl = (url: string) => {
  const shortcut = shortcuts.value.find(s => s.url === url);
  if (shortcut) {
    shortcut.visitCount++;
    saveShortcuts();
  }
  emit('open-url', url);
};

const toggleFavorite = (id: string, e: Event) => {
  e.stopPropagation();
  const shortcut = shortcuts.value.find(s => s.id === id);
  if (shortcut) {
    shortcut.isFavorite = !shortcut.isFavorite;
    saveShortcuts();
  }
};

const openAddForm = () => {
  editingId.value = null;
  formData.value = { name: '', url: '', icon: '', category: 'tools' };
  showAddForm.value = true;
};

const openEditForm = (shortcut: WebShortcut, e: Event) => {
  e.stopPropagation();
  editingId.value = shortcut.id;
  formData.value = {
    name: shortcut.name,
    url: shortcut.url,
    icon: shortcut.icon || '',
    category: shortcut.category,
  };
  showAddForm.value = true;
};

const saveShortcut = () => {
  if (!formData.value.name.trim() || !formData.value.url.trim()) {
    toast.error('请填写名称和网址');
    return;
  }

  let url = formData.value.url.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  if (editingId.value) {
    const index = shortcuts.value.findIndex(s => s.id === editingId.value);
    if (index !== -1) {
      shortcuts.value[index] = {
        ...shortcuts.value[index],
        name: formData.value.name.trim(),
        url,
        icon: formData.value.icon.trim(),
        category: formData.value.category,
      };
      toast.success('已更新');
    }
  } else {
    shortcuts.value.unshift({
      id: generateId(),
      name: formData.value.name.trim(),
      url,
      icon: formData.value.icon.trim(),
      category: formData.value.category,
      isFavorite: false,
      createdAt: Date.now(),
      visitCount: 0,
    });
    toast.success('已添加');
  }

  saveShortcuts();
  showAddForm.value = false;
};

const deleteShortcut = (id: string, e: Event) => {
  e.stopPropagation();
  shortcuts.value = shortcuts.value.filter(s => s.id !== id);
  saveShortcuts();
  toast.success('已删除');
};

const importDefaults = () => {
  const defaults: WebShortcut[] = [
    { id: generateId(), name: 'Google', url: 'https://www.google.com', icon: '🔍', category: 'tools', isFavorite: true, createdAt: Date.now(), visitCount: 0 },
    { id: generateId(), name: 'GitHub', url: 'https://github.com', icon: '🐙', category: 'dev', isFavorite: true, createdAt: Date.now(), visitCount: 0 },
    { id: generateId(), name: 'ChatGPT', url: 'https://chat.openai.com', icon: '🤖', category: 'ai', isFavorite: true, createdAt: Date.now(), visitCount: 0 },
    { id: generateId(), name: 'Claude', url: 'https://claude.ai', icon: '🧠', category: 'ai', isFavorite: true, createdAt: Date.now(), visitCount: 0 },
    { id: generateId(), name: 'YouTube', url: 'https://www.youtube.com', icon: '📺', category: 'media', isFavorite: false, createdAt: Date.now(), visitCount: 0 },
    { id: generateId(), name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '📚', category: 'dev', isFavorite: false, createdAt: Date.now(), visitCount: 0 },
    { id: generateId(), name: 'NPM', url: 'https://www.npmjs.com', icon: '📦', category: 'dev', isFavorite: false, createdAt: Date.now(), visitCount: 0 },
    { id: generateId(), name: 'Bilibili', url: 'https://www.bilibili.com', icon: '📺', category: 'media', isFavorite: false, createdAt: Date.now(), visitCount: 0 },
  ];
  shortcuts.value = [...defaults, ...shortcuts.value];
  saveShortcuts();
  toast.success('已导入默认快捷方式');
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (showAddForm.value) {
      showAddForm.value = false;
    } else {
      emit('close');
    }
  }
};

watch(() => props.visible, (val) => {
  if (val) {
    document.addEventListener('keydown', handleKeydown);
    if (shortcuts.value.length === 0) {
      importDefaults();
    }
  } else {
    document.removeEventListener('keydown', handleKeydown);
    showAddForm.value = false;
  }
});

onMounted(() => {
  loadShortcuts();
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="animate-fade-in"
      leave-active-class="animate-fade-out"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="background-color: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);"
        @click="emit('close')"
      >
        <div
          class="w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style="background-color: var(--bg-secondary); border: 1px solid var(--border-color);"
          @click.stop
        >
          <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color: var(--border-color);">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background-color: var(--primary-color);">
                <Globe :size="18" color="white" />
              </div>
              <div>
                <h2 class="text-base font-bold" style="color: var(--text-primary);">快捷网页</h2>
                <p class="text-xs" style="color: var(--text-tertiary);">{{ shortcuts.length }} 个快捷方式</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="openAddForm"
                class="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                style="background-color: var(--primary-color); color: white;"
              >
                <Plus :size="14" />
                添加
              </button>
              <button
                @click="emit('close')"
                class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style="background-color: var(--bg-tertiary); color: var(--text-secondary);"
              >
                <X :size="16" />
              </button>
            </div>
          </div>

          <div class="px-5 py-3 border-b" style="border-color: var(--border-color);">
            <div class="relative">
              <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2" style="color: var(--text-tertiary);" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索快捷方式..."
                class="w-full pl-10 pr-4 py-2 rounded-lg text-sm outline-none transition-colors"
                style="background-color: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary);"
              />
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <div v-if="favoriteShortcuts.length > 0 && !searchQuery" class="mb-4">
              <div class="text-xs font-medium mb-2 flex items-center gap-1.5" style="color: var(--text-tertiary);">
                <Star :size="12" fill="#fbbf24" style="color: #fbbf24;" />
                收藏
              </div>
              <div class="grid grid-cols-4 gap-2">
                <div
                  v-for="shortcut in favoriteShortcuts.slice(0, 8)"
                  :key="shortcut.id"
                  @click="openUrl(shortcut.url)"
                  class="flex flex-col items-center p-3 rounded-xl cursor-pointer transition-all hover:scale-105"
                  style="background-color: var(--bg-primary); border: 1px solid var(--border-color);"
                >
                  <div class="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-1.5" style="background-color: var(--bg-tertiary);">
                    <span v-if="shortcut.icon">{{ shortcut.icon }}</span>
                    <img v-else-if="getFavicon(shortcut.url)" :src="getFavicon(shortcut.url)!" class="w-5 h-5" />
                    <Globe v-else :size="20" style="color: var(--primary-color);" />
                  </div>
                  <span class="text-xs text-center truncate w-full" style="color: var(--text-primary);">{{ shortcut.name }}</span>
                </div>
              </div>
            </div>

            <div v-if="showAddForm" class="mb-4 p-4 rounded-xl" style="background-color: var(--bg-primary); border: 1px solid var(--border-color);">
              <div class="grid grid-cols-2 gap-3 mb-3">
                <input
                  v-model="formData.name"
                  type="text"
                  placeholder="名称 *"
                  class="px-3 py-2 rounded-lg text-sm outline-none"
                  style="background-color: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary);"
                />
                <input
                  v-model="formData.url"
                  type="text"
                  placeholder="网址 *"
                  class="px-3 py-2 rounded-lg text-sm outline-none"
                  style="background-color: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary);"
                />
              </div>
              <div class="grid grid-cols-2 gap-3 mb-3">
                <input
                  v-model="formData.icon"
                  type="text"
                  placeholder="图标 (emoji)"
                  class="px-3 py-2 rounded-lg text-sm outline-none"
                  style="background-color: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary);"
                />
                <select
                  v-model="formData.category"
                  class="px-3 py-2 rounded-lg text-sm outline-none"
                  style="background-color: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary);"
                >
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.icon }} {{ cat.name }}</option>
                </select>
              </div>
              <div class="flex justify-end gap-2">
                <button
                  @click="showAddForm = false"
                  class="px-3 py-1.5 rounded-lg text-xs"
                  style="background-color: var(--bg-tertiary); color: var(--text-secondary);"
                >
                  取消
                </button>
                <button
                  @click="saveShortcut"
                  class="px-3 py-1.5 rounded-lg text-xs"
                  style="background-color: var(--primary-color); color: white;"
                >
                  保存
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              <div
                v-for="shortcut in filteredShortcuts"
                :key="shortcut.id"
                @click="openUrl(shortcut.url)"
                class="group relative flex flex-col items-center p-3 rounded-xl cursor-pointer transition-all hover:scale-105"
                style="background-color: var(--bg-primary); border: 1px solid var(--border-color);"
              >
                <div class="shortcut-actions opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    @click="toggleFavorite(shortcut.id, $event)"
                    class="w-6 h-6 rounded flex items-center justify-center"
                    :style="{ backgroundColor: shortcut.isFavorite ? '#fef3c7' : 'var(--bg-tertiary)' }"
                  >
                    <Star v-if="shortcut.isFavorite" :size="10" fill="#fbbf24" style="color: #fbbf24;" />
                    <StarOff v-else :size="10" style="color: var(--text-tertiary);" />
                  </button>
                  <button
                    @click="openEditForm(shortcut, $event)"
                    class="w-6 h-6 rounded flex items-center justify-center"
                    style="background-color: var(--bg-tertiary);"
                  >
                    <Edit3 :size="10" style="color: var(--text-tertiary);" />
                  </button>
                  <button
                    @click="deleteShortcut(shortcut.id, $event)"
                    class="w-6 h-6 rounded flex items-center justify-center"
                    style="background-color: #fee2e2;"
                  >
                    <Trash2 :size="10" style="color: #ef4444;" />
                  </button>
                </div>
                <div class="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-1.5" style="background-color: var(--bg-tertiary);">
                  <span v-if="shortcut.icon">{{ shortcut.icon }}</span>
                  <img v-else-if="getFavicon(shortcut.url)" :src="getFavicon(shortcut.url)!" class="w-5 h-5" />
                  <Globe v-else :size="20" style="color: var(--primary-color);" />
                </div>
                <span class="text-xs text-center truncate w-full" style="color: var(--text-primary);">{{ shortcut.name }}</span>
              </div>
            </div>

            <div v-if="filteredShortcuts.length === 0" class="flex flex-col items-center justify-center py-8" style="color: var(--text-tertiary);">
              <Globe :size="32" class="opacity-30 mb-2" />
              <p class="text-sm">暂无快捷方式</p>
            </div>
          </div>

          <div class="px-5 py-2 border-t flex items-center justify-between text-xs" style="border-color: var(--border-color); color: var(--text-tertiary);">
            <span>点击打开网页 · 悬停显示操作</span>
            <span>共 {{ shortcuts.length }} 个</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.shortcut-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
}
</style>
