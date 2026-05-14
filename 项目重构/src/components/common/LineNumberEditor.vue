<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';

interface Props {
  modelValue: string;
  placeholder?: string;
  fontSize?: number;
  readonly?: boolean;
  language?: 'ini' | 'text' | 'diff';
  highlightLine?: number;
  diffType?: 'added' | 'removed' | 'context' | null;
  showDiffHighlight?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  fontSize: 14,
  readonly: false,
  language: 'text',
  highlightLine: -1,
  diffType: null,
  showDiffHighlight: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'scroll', scrollTop: number): void;
  (e: 'keydown', event: KeyboardEvent): void;
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const lineNumbersRef = ref<HTMLDivElement | null>(null);
const editorContainerRef = ref<HTMLDivElement | null>(null);
const scrollTop = ref(0);
const scrollLeft = ref(0);

const lines = computed(() => {
  const text = props.modelValue || '';
  return text.split('\n');
});

const lineCount = computed(() => lines.value.length);

const lineNumbersStyle = computed(() => ({
  fontSize: `${props.fontSize}px`,
  lineHeight: 1.6,
  paddingTop: '12px',
  transform: `translateY(-${scrollTop.value}px)`,
}));

const editorStyle = computed(() => ({
  fontSize: `${props.fontSize}px`,
  lineHeight: 1.6,
}));

const getLineClass = (index: number) => {
  const classes: string[] = [];
  if (props.highlightLine === index + 1) {
    classes.push('bg-yellow-100', 'dark:bg-yellow-900/20');
  }
  if (props.showDiffHighlight && props.diffType) {
    if (props.diffType === 'added') {
      classes.push('bg-green-50', 'dark:bg-green-900/10');
    } else if (props.diffType === 'removed') {
      classes.push('bg-red-50', 'dark:bg-red-900/10');
    }
  }
  return classes.join(' ');
};

const handleInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
};

const handleScroll = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  scrollTop.value = target.scrollTop;
  scrollLeft.value = target.scrollLeft;
  emit('scroll', target.scrollTop);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const textarea = textareaRef.value;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = props.modelValue;
    
    if (e.shiftKey) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      if (value.substring(lineStart, lineStart + 2) === '  ') {
        const newValue = value.substring(0, lineStart) + value.substring(lineStart + 2);
        emit('update:modelValue', newValue);
        nextTick(() => {
          textarea.selectionStart = textarea.selectionEnd = start - 2;
        });
      }
    } else {
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      emit('update:modelValue', newValue);
      nextTick(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }
  
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'd') {
      e.preventDefault();
      const textarea = textareaRef.value;
      if (!textarea) return;
      
      const start = textarea.selectionStart;
      const value = props.modelValue;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', start);
      const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
      const currentLine = value.substring(lineStart, actualLineEnd);
      const newValue = value.substring(0, actualLineEnd) + '\n' + currentLine + value.substring(actualLineEnd);
      emit('update:modelValue', newValue);
      nextTick(() => {
        textarea.selectionStart = textarea.selectionEnd = actualLineEnd + 1 + currentLine.length;
      });
    }
  }
  
  emit('keydown', e);
};

const scrollTo = (top: number) => {
  if (textareaRef.value) {
    textareaRef.value.scrollTop = top;
  }
};

const focus = () => {
  textareaRef.value?.focus();
};

defineExpose({
  scrollTo,
  focus,
  textareaRef,
});

const syncScroll = (source: 'textarea' | 'lineNumbers') => {
  if (source === 'textarea' && lineNumbersRef.value && textareaRef.value) {
    lineNumbersRef.value.scrollTop = textareaRef.value.scrollTop;
  }
};
</script>

<template>
  <div
    ref="editorContainerRef"
    class="flex h-full w-full overflow-hidden bg-background-primary"
  >
    <div
      ref="lineNumbersRef"
      class="flex-shrink-0 select-none text-right pr-2 pl-3 bg-background-secondary border-r border-border overflow-hidden"
      :style="{ width: `${Math.max(40, String(lineCount).length * 10 + 20)}px` }"
    >
      <div :style="lineNumbersStyle" class="font-mono">
        <div
          v-for="(line, index) in lineCount"
          :key="index"
          class="text-text-tertiary hover:text-text-secondary transition-colors"
          :class="getLineClass(index)"
        >
          {{ index + 1 }}
        </div>
      </div>
    </div>
    
    <div class="flex-1 relative overflow-hidden">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        :placeholder="placeholder"
        :readonly="readonly"
        class="w-full h-full p-3 bg-transparent text-text-primary font-mono resize-none outline-none border-none"
        :style="editorStyle"
        :class="{ 'cursor-default': readonly }"
        spellcheck="false"
        @input="handleInput"
        @scroll="handleScroll"
        @keydown="handleKeydown"
      ></textarea>
      
      <div
        v-if="!modelValue"
        class="absolute top-3 left-3 pointer-events-none text-text-tertiary font-mono"
        :style="{ fontSize: `${fontSize}px` }"
      >
        {{ placeholder }}
      </div>
    </div>
  </div>
</template>

<style scoped>
textarea::placeholder {
  color: transparent;
}

textarea::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

textarea::-webkit-scrollbar-track {
  background: transparent;
}

textarea::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

textarea::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}
</style>
