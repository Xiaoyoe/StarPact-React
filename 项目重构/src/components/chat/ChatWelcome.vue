<script setup lang="ts">
import { computed } from 'vue';
import { 
  MessageSquare, Sparkles, Shield, Brain, Timer, 
  Image as ImageIcon, Code, BookOpen, PenTool, ArrowRight 
} from 'lucide-vue-next';
import { useConversationStore } from '@/stores';

interface Props {
  onStartChat: () => void;
  onSuggestionClick?: (text: string) => void;
}

const props = defineProps<Props>();

const conversationStore = useConversationStore();

const suggestions = [
  { icon: Code, text: '你叫什么，你是谁？' },
  { icon: BookOpen, text: '解释一下量子计算的原理' },
  { icon: PenTool, text: '写一篇关于人工智能的文章' },
  { icon: ImageIcon, text: '分析这张图片的内容' },
];

const stats = computed(() => [
  { value: conversationStore.models.length, label: '可用模型' },
  { value: '100%', label: '本地运行' },
  { value: '∞', label: '对话次数' },
]);

const handleSuggestionClick = (text: string) => {
  if (props.onSuggestionClick) {
    props.onSuggestionClick(text);
  } else {
    props.onStartChat();
  }
};
</script>

<template>
  <div class="chat-welcome">
    <div class="animated-bg">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
    </div>

    <div class="content-wrapper">
      <div class="hero-section">
        <div class="hero-icon">
          <Sparkles :size="28" color="white" />
        </div>

        <h1 class="hero-title">你好，我是 AI 助手</h1>
        <p class="hero-subtitle">
          基于 Ollama 本地运行，安全、私密、强大。有什么我可以帮助你的吗？
        </p>
      </div>

      <div class="stats-bar">
        <div v-for="(stat, index) in stats" :key="index" class="stat-item">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>

      <div class="input-box" @click="onStartChat">
        <div class="input-icon">
          <MessageSquare :size="18" />
        </div>
        <span class="input-placeholder">输入消息开始对话...</span>
        <div class="input-arrow">
          <ArrowRight :size="18" color="white" />
        </div>
      </div>

      <div class="suggestions-section">
        <div class="suggestions-title">试试这些</div>
        <div class="suggestions-grid">
          <button
            v-for="(suggestion, index) in suggestions"
            :key="index"
            class="suggestion-item"
            @click="handleSuggestionClick(suggestion.text)"
          >
            <div class="suggestion-icon">
              <component :is="suggestion.icon" :size="16" />
            </div>
            <span class="suggestion-text">{{ suggestion.text }}</span>
          </button>
        </div>
      </div>

      <div class="model-status">
        <div 
          class="status-dot"
          :class="{ 'status-active': conversationStore.activeModel }"
        ></div>
        <span class="status-text">
          {{ conversationStore.activeModel ? 
            `${conversationStore.activeModel.name} · 点击开始` : 
            '请先选择模型' 
          }}
        </span>
      </div>
    </div>

    <div class="features-bar">
      <div class="feature-item">
        <Shield :size="16" />
        <span>本地运行</span>
      </div>
      <div class="feature-item">
        <Brain :size="16" />
        <span>深度思考</span>
      </div>
      <div class="feature-item">
        <Timer :size="16" />
        <span>性能监控</span>
      </div>
      <div class="feature-item">
        <ImageIcon :size="16" />
        <span>图像识别</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  background-color: var(--bg-primary);
}

.animated-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
}

.bg-circle-1 {
  top: 0;
  left: 25%;
  width: 500px;
  height: 500px;
  background-color: var(--primary-color);
  opacity: 0.08;
  animation: pulse 4s ease-in-out infinite;
}

.bg-circle-2 {
  bottom: 0;
  right: 25%;
  width: 400px;
  height: 400px;
  background-color: #8b5cf6;
  opacity: 0.06;
  filter: blur(80px);
}

@keyframes pulse {
  0%, 100% { opacity: 0.08; }
  50% { opacity: 0.12; }
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  position: relative;
  z-index: 10;
  max-width: 672px;
  margin: 0 auto;
  width: 100%;
}

.hero-section {
  text-align: center;
  margin-bottom: 40px;
}

.hero-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 50%, #ec4899 100%);
  box-shadow: 0 12px 40px -12px rgba(139, 92, 246, 0.5);
}

.hero-title {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.hero-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  max-width: 448px;
  margin: 0 auto;
}

.stats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 32px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.input-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 24px;
  width: 100%;
}

.input-box:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.input-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--primary-light);
  color: var(--primary-color);
  flex-shrink: 0;
}

.input-placeholder {
  flex: 1;
  font-size: 14px;
  color: var(--text-tertiary);
}

.input-arrow {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.input-box:hover .input-arrow {
  transform: scale(1.05);
}

.suggestions-section {
  width: 100%;
  margin-bottom: 32px;
}

.suggestions-title {
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  color: var(--text-tertiary);
  margin-bottom: 12px;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.suggestion-item:hover {
  transform: scale(1.01);
}

.suggestion-item:active {
  transform: scale(0.99);
}

.suggestion-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.suggestion-text {
  font-size: 14px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--error-color);
}

.status-dot.status-active {
  background-color: var(--success-color);
  animation: pulse 2s ease-in-out infinite;
}

.status-text {
  font-size: 12px;
  color: var(--text-tertiary);
}

.features-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 24px;
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  position: relative;
  z-index: 10;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-tertiary);
}

.feature-item span {
  font-size: 12px;
}

@media (max-width: 640px) {
  .suggestions-grid {
    grid-template-columns: 1fr;
  }
  
  .features-bar {
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .feature-item span {
    display: none;
  }
}
</style>
