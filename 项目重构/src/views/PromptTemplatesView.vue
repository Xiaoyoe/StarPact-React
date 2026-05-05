<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToast } from '@/composables/useToast';
import {
  Plus, Search, Copy, Edit3, Trash2, ChevronDown,
  X, FileText, Image, Eye, Link2, FolderOpen,
  Tag, Filter, Clock, Layers, BookOpen
} from 'lucide-vue-next';

const toast = useToast();

interface TemplateResult {
  id: string;
  type: 'text' | 'image';
  versionNote: string;
  createdAt: string;
  content: string;
}

interface Template {
  id: string;
  title: string;
  category: string;
  tags: string[];
  versionNote: string;
  content: string;
  results: TemplateResult[];
  createdAt: string;
}

const CATEGORIES = ['通用', 'AI绘画', '文案创作', '代码生成', '数据分析', '翻译润色', '角色扮演', '学术研究'];

const categoryColorMap: Record<string, string> = {
  '通用': 'from-slate-400 to-slate-500',
  'AI绘画': 'from-pink-400 to-rose-500',
  '文案创作': 'from-amber-400 to-orange-500',
  '代码生成': 'from-emerald-400 to-teal-500',
  '数据分析': 'from-blue-400 to-indigo-500',
  '翻译润色': 'from-cyan-400 to-sky-500',
  '角色扮演': 'from-purple-400 to-violet-500',
  '学术研究': 'from-lime-500 to-green-500',
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const getNowString = (): string => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const templates = ref<Template[]>([]);
const searchQuery = ref('');
const filterCategory = ref('');
const filterTag = ref('');
const showForm = ref(false);
const editingTemplate = ref<Template | null>(null);
const resultModalTemplate = ref<Template | null>(null);
const confirmDelete = ref<string | null>(null);
const isLoading = ref(true);

const formData = ref({
  title: '',
  category: CATEGORIES[0],
  tags: [] as string[],
  versionNote: '',
  content: ''
});
const tagInput = ref('');
const formErrors = ref<{ title?: string; content?: string }>({});

const resultFormData = ref<TemplateResult>({
  id: '',
  type: 'text',
  versionNote: '',
  createdAt: '',
  content: ''
});
const editingResult = ref<TemplateResult | null>(null);
const isAddingResult = ref(false);
const previewImageUrl = ref<string | null>(null);
const confirmDeleteResult = ref<string | null>(null);

const allTags = computed(() => {
  const tagSet = new Set<string>();
  templates.value.forEach(t => t.tags.forEach(tag => tagSet.add(tag)));
  return Array.from(tagSet).sort();
});

const usedCategories = computed(() => {
  const catSet = new Set<string>();
  templates.value.forEach(t => catSet.add(t.category));
  return CATEGORIES.filter(c => catSet.has(c));
});

const filteredTemplates = computed(() => {
  let result = templates.value;
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }
  if (filterCategory.value) {
    result = result.filter(t => t.category === filterCategory.value);
  }
  if (filterTag.value) {
    result = result.filter(t => t.tags.includes(filterTag.value));
  }
  return result;
});

const hasFilters = computed(() => searchQuery.value || filterCategory.value || filterTag.value);

const sortedResults = computed(() => {
  if (!resultModalTemplate.value) return [];
  return [...resultModalTemplate.value.results].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
});

const loadTemplates = () => {
  isLoading.value = true;
  try {
    const saved = localStorage.getItem('prompt_templates');
    if (saved) {
      templates.value = JSON.parse(saved);
    } else {
      templates.value = [
        {
          id: generateId(),
          title: '代码审查助手',
          category: '代码生成',
          tags: ['代码', '审查', '优化'],
          versionNote: 'v1.0',
          content: '你是一位专业的代码审查专家。请审查以下代码，并提供详细的改进建议：\n\n1. 代码质量分析\n2. 潜在问题识别\n3. 性能优化建议\n4. 最佳实践推荐',
          results: [],
          createdAt: new Date().toISOString()
        },
        {
          id: generateId(),
          title: '翻译助手',
          category: '翻译润色',
          tags: ['翻译', '多语言'],
          versionNote: 'v1.0',
          content: '你是一位专业的翻译专家。请将以下内容翻译成目标语言，确保：\n\n1. 翻译准确\n2. 语言流畅\n3. 符合目标语言的表达习惯\n4. 保持原文的风格和语气',
          results: [],
          createdAt: new Date().toISOString()
        }
      ];
      saveTemplates();
    }
  } catch {
    templates.value = [];
  } finally {
    isLoading.value = false;
  }
};

const saveTemplates = () => {
  localStorage.setItem('prompt_templates', JSON.stringify(templates.value));
};

const openAdd = () => {
  editingTemplate.value = null;
  formData.value = {
    title: '',
    category: CATEGORIES[0],
    tags: [],
    versionNote: '',
    content: ''
  };
  formErrors.value = {};
  showForm.value = true;
};

const openEdit = (t: Template) => {
  editingTemplate.value = t;
  formData.value = {
    title: t.title,
    category: t.category,
    tags: [...t.tags],
    versionNote: t.versionNote,
    content: t.content
  };
  formErrors.value = {};
  showForm.value = true;
};

const deleteTemplate = (id: string) => {
  templates.value = templates.value.filter(t => t.id !== id);
  saveTemplates();
  confirmDelete.value = null;
  toast.success('模板已删除');
};

const validateForm = (): boolean => {
  const errors: { title?: string; content?: string } = {};
  if (!formData.value.title.trim()) errors.title = '标题为必填项';
  if (!formData.value.content.trim()) errors.content = '提示词内容为必填项';
  formErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const handleSaveTemplate = () => {
  if (!validateForm()) return;
  
  if (editingTemplate.value) {
    const idx = templates.value.findIndex(t => t.id === editingTemplate.value!.id);
    if (idx >= 0) {
      templates.value[idx] = {
        ...editingTemplate.value,
        ...formData.value
      };
    }
    toast.success('模板已更新');
  } else {
    templates.value.unshift({
      id: generateId(),
      ...formData.value,
      results: [],
      createdAt: new Date().toISOString()
    });
    toast.success('模板已创建');
  }
  
  saveTemplates();
  showForm.value = false;
  editingTemplate.value = null;
};

const addTags = () => {
  const newTags = tagInput.value.split(/[,，]/).map(t => t.trim()).filter(t => t && !formData.value.tags.includes(t));
  if (newTags.length > 0) {
    formData.value.tags.push(...newTags);
  }
  tagInput.value = '';
};

const removeTag = (tag: string) => {
  formData.value.tags = formData.value.tags.filter(t => t !== tag);
};

const handleTagKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addTags();
  }
};

const copyContent = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content);
    toast.success('提示词已复制到剪贴板');
  } catch {
    toast.error('复制失败，请手动复制');
  }
};

const clearFilters = () => {
  searchQuery.value = '';
  filterCategory.value = '';
  filterTag.value = '';
};

const openResultModal = (template: Template) => {
  resultModalTemplate.value = template;
};

const startAddResult = () => {
  resultFormData.value = {
    id: generateId(),
    type: 'text',
    versionNote: '',
    createdAt: getNowString(),
    content: ''
  };
  editingResult.value = null;
  isAddingResult.value = true;
};

const startEditResult = (result: TemplateResult) => {
  resultFormData.value = { ...result };
  editingResult.value = result;
  isAddingResult.value = false;
};

const cancelResultForm = () => {
  isAddingResult.value = false;
  editingResult.value = null;
};

const saveResult = () => {
  if (!resultFormData.value.content.trim() || !resultModalTemplate.value) return;
  
  if (editingResult.value) {
    const idx = resultModalTemplate.value.results.findIndex(r => r.id === editingResult.value!.id);
    if (idx >= 0) {
      resultModalTemplate.value.results[idx] = resultFormData.value;
    }
  } else {
    resultModalTemplate.value.results.unshift(resultFormData.value);
  }
  
  saveTemplates();
  cancelResultForm();
  toast.success(editingResult.value ? '结果已更新' : '结果已添加');
};

const deleteResult = (id: string) => {
  if (!resultModalTemplate.value) return;
  resultModalTemplate.value.results = resultModalTemplate.value.results.filter(r => r.id !== id);
  saveTemplates();
  confirmDeleteResult.value = null;
  toast.success('结果已删除');
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('已复制');
  } catch {}
};

onMounted(() => {
  loadTemplates();
});
</script>

<template>
  <div class="h-full flex flex-col bg-background-primary overflow-hidden">
    <!-- Search & Filter Bar -->
    <div class="sticky top-0 z-20 border-b border-border bg-background-primary px-4 sm:px-6 lg:px-8 py-3">
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[240px]">
          <Search class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索标题、内容、标签..."
            class="w-full rounded-xl border border-border bg-background-primary pl-10 pr-4 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition-all"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
          >
            <X :size="16" />
          </button>
        </div>

        <button
          v-if="hasFilters"
          @click="clearFilters"
          class="inline-flex items-center gap-1 rounded-xl border border-red-400 bg-background-primary px-3 py-2.5 text-xs font-medium text-red-500 transition-all duration-200 hover:scale-105"
        >
          <X :size="12" />
          清除筛选
        </button>

        <div class="relative">
          <Filter class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none z-10" :class="filterCategory ? 'text-primary' : 'text-text-tertiary'" />
          <select
            v-model="filterCategory"
            class="appearance-none rounded-xl border py-2.5 pl-8 pr-8 text-sm outline-none transition-all cursor-pointer hover:scale-105"
            :class="filterCategory ? 'border-primary bg-primary-light text-primary' : 'border-border bg-background-primary text-text-secondary hover:border-primary-light'"
          >
            <option value="">全部分类</option>
            <option v-for="c in usedCategories" :key="c" :value="c">{{ c }}</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none" :class="filterCategory ? 'text-primary' : 'text-text-tertiary'" />
        </div>

        <div class="relative">
          <Tag class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none z-10" :class="filterTag ? 'text-primary' : 'text-text-tertiary'" />
          <select
            v-model="filterTag"
            class="appearance-none rounded-xl border py-2.5 pl-8 pr-8 text-sm outline-none transition-all cursor-pointer hover:scale-105"
            :class="filterTag ? 'border-primary bg-primary-light text-primary' : 'border-border bg-background-primary text-text-secondary hover:border-primary-light'"
          >
            <option value="">全部标签</option>
            <option v-for="t in allTags" :key="t" :value="t">{{ t }}</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none" :class="filterTag ? 'text-primary' : 'text-text-tertiary'" />
        </div>

        <button
          @click="openAdd"
          class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:scale-105 shadow-md"
        >
          <Plus :size="16" />
          新增模板
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="mb-5 flex items-center justify-between">
        <p class="text-sm text-text-tertiary">
          <template v-if="hasFilters">
            找到 <span class="font-semibold">{{ filteredTemplates.length }}</span> 个匹配模板（共 {{ templates.length }} 个）
          </template>
          <template v-else>
            共 <span class="font-semibold">{{ templates.length }}</span> 个模板
          </template>
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-24">
        <div class="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-background-secondary">
          <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p class="text-base font-medium text-text-secondary">正在加载模板...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredTemplates.length === 0" class="flex flex-col items-center justify-center py-24">
        <div class="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-background-secondary">
          <FolderOpen :size="40" class="text-text-tertiary" />
        </div>
        <p class="text-base font-medium text-text-secondary">
          {{ hasFilters ? '没有找到匹配的模板' : '暂无模板' }}
        </p>
        <p class="mt-1 text-sm text-text-tertiary">
          {{ hasFilters ? '试试调整搜索条件或清除筛选' : '点击右上角「新增模板」开始创建' }}
        </p>
        <button
          v-if="hasFilters"
          @click="clearFilters"
          class="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors"
        >
          清除筛选条件
        </button>
      </div>

      <!-- Template Grid -->
      <div v-else class="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="template in filteredTemplates"
          :key="template.id"
          class="group relative rounded-2xl border border-border p-5 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-300 cursor-pointer bg-transparent"
          @click="openResultModal(template)"
        >
          <div :class="['absolute top-0 left-6 right-6 h-1 rounded-b-full bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity', categoryColorMap[template.category] || 'from-slate-400 to-slate-500']" />

          <div class="flex items-start justify-between mb-3">
            <div class="flex-1 min-w-0 pr-3">
              <h3 class="text-base font-semibold truncate text-text-primary">{{ template.title }}</h3>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span :class="['inline-flex items-center gap-1 rounded-lg bg-gradient-to-r px-2.5 py-0.5 text-xs font-medium text-white', categoryColorMap[template.category] || 'from-slate-400 to-slate-500']">
                  <BookOpen :size="12" />
                  {{ template.category }}
                </span>
                <span v-if="template.versionNote" class="rounded-lg px-2 py-0.5 text-xs border border-border-light bg-background-secondary text-text-secondary">
                  {{ template.versionNote }}
                </span>
                <span class="text-xs text-text-tertiary">{{ template.results.length }} 个结果</span>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button @click.stop="copyContent(template.content)" class="rounded-lg p-2 hover:bg-violet-50 hover:text-violet-500 transition-colors text-text-tertiary" title="一键复制">
                <Copy :size="16" />
              </button>
              <button @click.stop="openEdit(template)" class="rounded-lg p-2 hover:bg-blue-50 hover:text-blue-500 transition-colors text-text-tertiary" title="编辑">
                <Edit3 :size="16" />
              </button>
              <button @click.stop="confirmDelete = template.id" class="rounded-lg p-2 hover:bg-red-50 hover:text-red-500 transition-colors text-text-tertiary" title="删除">
                <Trash2 :size="16" />
              </button>
            </div>
          </div>

          <div v-if="template.tags.length > 0" class="flex flex-wrap gap-1.5 mb-3">
            <span v-for="tag in template.tags" :key="tag" class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs border border-border-light bg-background-secondary text-text-secondary">
              <Tag :size="10" class="text-text-tertiary" />
              {{ tag }}
            </span>
          </div>

          <div class="relative rounded-xl border border-border-light bg-background-secondary p-3">
            <pre class="whitespace-pre-wrap text-sm leading-relaxed font-sans text-text-secondary line-clamp-3">{{ template.content }}</pre>
          </div>

          <div class="mt-3 flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs text-text-tertiary">
              <Clock :size="12" />
              {{ formatDate(template.createdAt) }}
            </span>
            <button
              @click.stop="openResultModal(template)"
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-all shadow-sm"
            >
              <Layers :size="14" />
              结果管理
              <span v-if="template.results.length > 0" class="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-[10px]">
                {{ template.results.length }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Template Form Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="animate-fade-in"
        leave-active-class="animate-fade-out"
      >
        <div
          v-if="showForm"
          class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto backdrop-blur-sm py-8"
          style="background-color: rgba(0, 0, 0, 0.4)"
          @click="showForm = false"
        >
          <div
            class="w-full max-w-2xl rounded-2xl shadow-2xl mx-4 bg-background-secondary border border-border"
            @click.stop
          >
            <div class="flex items-center justify-between border-b border-border px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm bg-primary">
                  <Edit3 v-if="editingTemplate" :size="20" class="text-white" />
                  <Plus v-else :size="20" class="text-white" />
                </div>
                <h2 class="text-lg font-semibold text-text-primary">{{ editingTemplate ? '编辑模板' : '新增模板' }}</h2>
              </div>
              <button @click="showForm = false" class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-background-tertiary transition-colors">
                <X :size="20" class="text-text-tertiary" />
              </button>
            </div>

            <div class="space-y-4 px-6 py-5">
              <div>
                <label class="mb-1.5 flex items-center gap-1 text-sm font-medium text-text-secondary">
                  标题 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.title"
                  type="text"
                  placeholder="输入模板标题..."
                  class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all bg-background-primary text-text-primary"
                  :class="formErrors.title ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-border focus:border-primary focus:ring-2 focus:ring-primary-light'"
                />
                <p v-if="formErrors.title" class="mt-1 text-xs text-red-500">{{ formErrors.title }}</p>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-text-secondary">分类</label>
                  <select
                    v-model="formData.category"
                    class="w-full rounded-xl border border-border bg-background-primary px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition-all text-text-primary"
                  >
                    <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-text-secondary">版本备注</label>
                  <input
                    v-model="formData.versionNote"
                    type="text"
                    placeholder="选填，如 v1.0"
                    class="w-full rounded-xl border border-border bg-background-primary px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition-all text-text-primary"
                  />
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-text-secondary">标签</label>
                <div class="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background-primary px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-light transition-all">
                  <span v-for="tag in formData.tags" :key="tag" class="inline-flex items-center gap-1 rounded-lg border border-border bg-background-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
                    {{ tag }}
                    <button type="button" @click="removeTag(tag)" class="text-text-tertiary hover:text-text-primary">
                      <X :size="12" />
                    </button>
                  </span>
                  <input
                    v-model="tagInput"
                    type="text"
                    @keydown="handleTagKeydown"
                    @blur="addTags"
                    :placeholder="formData.tags.length === 0 ? '输入标签，用逗号分隔...' : '继续添加...'"
                    class="min-w-[120px] flex-1 border-none bg-transparent text-sm outline-none text-text-primary"
                  />
                </div>
              </div>

              <div>
                <label class="mb-1.5 flex items-center gap-1 text-sm font-medium text-text-secondary">
                  提示词内容 <span class="text-red-500">*</span>
                </label>
                <textarea
                  v-model="formData.content"
                  rows="8"
                  placeholder="输入提示词内容..."
                  class="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all resize-none leading-relaxed bg-background-primary text-text-primary"
                  :class="formErrors.content ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-border focus:border-primary focus:ring-2 focus:ring-primary-light'"
                ></textarea>
                <p v-if="formErrors.content" class="mt-1 text-xs text-red-500">{{ formErrors.content }}</p>
              </div>

              <div class="flex justify-end gap-3 border-t border-border px-6 py-4 -mx-6 -mb-5 mt-4">
                <button @click="showForm = false" class="rounded-xl border border-border px-5 py-2 text-sm font-medium text-text-secondary hover:bg-background-tertiary transition-colors">取消</button>
                <button @click="handleSaveTemplate" class="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors shadow-sm">
                  {{ editingTemplate ? '更新模板' : '创建模板' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Result Manager Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="animate-fade-in"
        leave-active-class="animate-fade-out"
      >
        <div
          v-if="resultModalTemplate"
          class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto backdrop-blur-sm py-8"
          style="background-color: rgba(0, 0, 0, 0.4)"
          @click="resultModalTemplate = null"
        >
          <div
            class="w-full max-w-3xl rounded-2xl shadow-2xl mx-4 bg-background-secondary border border-border"
            @click.stop
          >
            <div class="flex items-center justify-between border-b border-border px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm bg-primary">
                  <Layers :size="20" class="text-white" />
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-text-primary">结果管理</h2>
                  <p class="text-xs text-text-tertiary">{{ resultModalTemplate.title }}</p>
                </div>
              </div>
              <button @click="resultModalTemplate = null" class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-background-tertiary transition-colors">
                <X :size="20" class="text-text-tertiary" />
              </button>
            </div>

            <div class="px-6 py-4 max-h-[70vh] overflow-y-auto">
              <button
                v-if="!isAddingResult && !editingResult"
                @click="startAddResult"
                class="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium text-text-tertiary hover:border-primary hover:text-primary hover:bg-primary-light/50 transition-all"
              >
                <Plus :size="16" />
                添加新结果
              </button>

              <div v-if="isAddingResult || editingResult" class="mb-4 rounded-xl border border-border bg-background-primary p-4 space-y-3">
                <h3 class="text-sm font-semibold text-primary">{{ editingResult ? '编辑结果' : '添加新结果' }}</h3>
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-text-secondary">结果类型</label>
                    <select
                      v-model="resultFormData.type"
                      class="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm outline-none focus:border-primary text-text-primary"
                    >
                      <option value="text">文本</option>
                      <option value="image">图片</option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-text-secondary">版本备注</label>
                    <input
                      v-model="resultFormData.versionNote"
                      type="text"
                      placeholder="选填"
                      class="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm outline-none focus:border-primary text-text-primary"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-text-secondary">生成日期</label>
                    <input
                      v-model="resultFormData.createdAt"
                      type="datetime-local"
                      class="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm outline-none focus:border-primary text-text-primary"
                    />
                  </div>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-text-secondary">
                    {{ resultFormData.type === 'image' ? '图片链接/URL' : '文本内容' }}
                  </label>
                  <textarea
                    v-if="resultFormData.type === 'text'"
                    v-model="resultFormData.content"
                    rows="4"
                    placeholder="输入生成结果的文本内容..."
                    class="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm outline-none focus:border-primary resize-none text-text-primary"
                  ></textarea>
                  <input
                    v-else
                    v-model="resultFormData.content"
                    type="text"
                    placeholder="粘贴图片URL链接..."
                    class="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm outline-none focus:border-primary text-text-primary"
                  />
                </div>
                <div class="flex justify-end gap-2 pt-1">
                  <button @click="cancelResultForm" class="rounded-lg border border-border px-4 py-1.5 text-sm font-medium text-text-secondary hover:bg-background-tertiary transition-colors">取消</button>
                  <button @click="saveResult" class="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-colors shadow-sm">保存</button>
                </div>
              </div>

              <div v-if="sortedResults.length === 0 && !isAddingResult && !editingResult" class="flex flex-col items-center justify-center py-12">
                <FolderOpen :size="48" class="mb-3 text-text-tertiary" />
                <p class="text-sm text-text-tertiary">暂无结果，点击上方按钮添加</p>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="result in sortedResults"
                  :key="result.id"
                  class="group rounded-xl border border-border bg-background-primary p-4 hover:shadow-md transition-all"
                >
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="inline-flex items-center gap-1 rounded-lg border border-border bg-background-secondary px-2 py-0.5 text-xs font-medium text-text-secondary">
                        <FileText v-if="result.type === 'text'" :size="12" />
                        <Image v-else :size="12" />
                        {{ result.type === 'text' ? '文本' : '图片' }}
                      </span>
                      <span v-if="result.versionNote" class="rounded-lg border border-border bg-background-secondary px-2 py-0.5 text-xs text-text-secondary">{{ result.versionNote }}</span>
                      <span class="flex items-center gap-1 text-xs text-text-tertiary">
                        <Clock :size="12" />
                        {{ formatDate(result.createdAt) }}
                      </span>
                    </div>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <template v-if="result.type === 'text'">
                        <button @click="copyText(result.content)" class="rounded-lg p-1.5 hover:bg-background-tertiary hover:text-primary transition-colors text-text-tertiary" title="复制内容">
                          <Copy :size="14" />
                        </button>
                      </template>
                      <template v-else>
                        <button @click="previewImageUrl = result.content" class="rounded-lg p-1.5 hover:bg-background-tertiary hover:text-primary transition-colors text-text-tertiary" title="查看原图">
                          <Eye :size="14" />
                        </button>
                        <button @click="copyText(result.content)" class="rounded-lg p-1.5 hover:bg-background-tertiary hover:text-primary transition-colors text-text-tertiary" title="复制图片链接">
                          <Link2 :size="14" />
                        </button>
                      </template>
                      <button @click="startEditResult(result)" class="rounded-lg p-1.5 hover:bg-background-tertiary hover:text-blue-500 transition-colors text-text-tertiary" title="编辑">
                        <Edit3 :size="14" />
                      </button>
                      <button @click="confirmDeleteResult = result.id" class="rounded-lg p-1.5 hover:bg-background-tertiary hover:text-red-500 transition-colors text-text-tertiary" title="删除">
                        <Trash2 :size="14" />
                      </button>
                    </div>
                  </div>
                  <template v-if="result.type === 'text'">
                    <p class="text-sm leading-relaxed whitespace-pre-wrap text-text-secondary">{{ result.content }}</p>
                  </template>
                  <template v-else>
                    <div class="mt-1">
                      <img
                        :src="result.content"
                        alt="结果图片"
                        class="h-32 w-auto rounded-lg object-cover cursor-pointer border border-border hover:shadow-md transition-shadow"
                        @click="previewImageUrl = result.content"
                      />
                      <p class="mt-1.5 text-xs truncate max-w-xs text-text-tertiary">{{ result.content }}</p>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Image Preview Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="animate-fade-in"
        leave-active-class="animate-fade-out"
      >
        <div
          v-if="previewImageUrl"
          class="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          @click="previewImageUrl = null"
        >
          <div class="relative max-h-[90vh] max-w-[90vw]" @click.stop>
            <button @click="previewImageUrl = null" class="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg hover:bg-slate-100 transition-colors">
              <X :size="16" class="text-slate-600" />
            </button>
            <img :src="previewImageUrl" alt="预览" class="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl" />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Confirm Delete Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="animate-fade-in"
        leave-active-class="animate-fade-out"
      >
        <div
          v-if="confirmDelete"
          class="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
          style="background-color: rgba(0, 0, 0, 0.4)"
          @click="confirmDelete = null"
        >
          <div class="w-full max-w-sm rounded-2xl p-6 shadow-2xl bg-background-secondary border border-border" @click.stop>
            <h3 class="text-lg font-semibold text-text-primary">删除模板</h3>
            <p class="mt-2 text-sm text-text-secondary">确定要删除这个模板吗？关联的所有结果也将被删除。此操作不可撤销。</p>
            <div class="mt-5 flex justify-end gap-3">
              <button @click="confirmDelete = null" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background-tertiary transition-colors">取消</button>
              <button @click="confirmDelete && deleteTemplate(confirmDelete)" class="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors shadow-sm">确认删除</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Confirm Delete Result Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="animate-fade-in"
        leave-active-class="animate-fade-out"
      >
        <div
          v-if="confirmDeleteResult"
          class="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
          style="background-color: rgba(0, 0, 0, 0.4)"
          @click="confirmDeleteResult = null"
        >
          <div class="w-full max-w-sm rounded-2xl p-6 shadow-2xl bg-background-secondary border border-border" @click.stop>
            <h3 class="text-lg font-semibold text-text-primary">删除结果</h3>
            <p class="mt-2 text-sm text-text-secondary">确定要删除这个结果吗？此操作不可撤销。</p>
            <div class="mt-5 flex justify-end gap-3">
              <button @click="confirmDeleteResult = null" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background-tertiary transition-colors">取消</button>
              <button @click="confirmDeleteResult && deleteResult(confirmDeleteResult)" class="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors shadow-sm">确认删除</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
