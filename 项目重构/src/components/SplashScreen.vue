<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Bot, Sparkles } from 'lucide-vue-next';

interface Props {
  enabled: boolean;
  progress: number;
  currentStep: string;
  minDisplayTime?: number;
}

const props = withDefaults(defineProps<Props>(), {
  minDisplayTime: 800
});

const emit = defineEmits<{
  (e: 'complete'): void;
}>();

const quotes = [
  '每一次对话，都是思想的碰撞',
  '让 AI 成为你的智慧伙伴',
  '探索无限可能，从这里开始',
  '智能对话，启迪思维'
];

const currentQuote = ref(0);
const canClose = ref(false);
const startTime = ref(Date.now());

const displayProgress = computed(() => {
  const elapsed = Date.now() - startTime.value;
  const progressRatio = Math.min(elapsed / props.minDisplayTime, 1);
  return Math.max(props.progress, Math.round(progressRatio * 100));
});

onMounted(() => {
  if (!props.enabled) {
    emit('complete');
    return;
  }
  
  setTimeout(() => {
    canClose.value = true;
  }, props.minDisplayTime);
  
  const quoteInterval = setInterval(() => {
    currentQuote.value = (currentQuote.value + 1) % quotes.length;
  }, 3000);
  
  return () => clearInterval(quoteInterval);
});

watch([() => props.progress, canClose], ([newProgress, newCanClose]) => {
  if (newProgress >= 100 && newCanClose) {
    setTimeout(() => emit('complete'), 200);
  }
});
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    leave-active-class="transition-opacity duration-300"
    leave-to-class="opacity-0"
  >
    <div
      v-if="enabled"
      class="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style="background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-primary) 100%)"
    >
      <div class="absolute inset-0 overflow-hidden">
        <div
          class="absolute inset-0 animate-fade-in"
          style="background: radial-gradient(circle at 30% 40%, var(--primary-light) 0%, transparent 50%); opacity: 0.3;"
        />
        <div
          class="absolute inset-0 animate-fade-in-delayed"
          style="background: radial-gradient(circle at 70% 60%, var(--primary-light) 0%, transparent 40%); opacity: 0.2;"
        />
      </div>

      <div class="relative z-10 flex flex-col items-center animate-scale-in">
        <div class="relative animate-float">
          <div
            class="flex h-24 w-24 items-center justify-center rounded-3xl shadow-2xl"
            style="background-color: var(--primary-color); box-shadow: 0 20px 60px -15px var(--primary-color)"
          >
            <Bot :size="48" color="white" />
          </div>
          
          <div class="absolute -top-2 -right-2 animate-spin-slow">
            <Sparkles :size="20" style="color: var(--warning-color)" />
          </div>
        </div>

        <div class="mt-8 text-center animate-slide-up">
          <h1 class="text-3xl font-bold tracking-tight" style="color: var(--text-primary)">
            Starpact
          </h1>
          <p class="mt-2 text-sm" style="color: var(--text-tertiary)">
            智能对话助手
          </p>
        </div>

        <div class="mt-8 w-64 animate-fade-in-delayed">
          <div
            class="h-1.5 rounded-full overflow-hidden"
            style="background-color: var(--bg-tertiary)"
          >
            <div
              class="h-full rounded-full transition-all duration-300"
              :style="{ 
                width: `${Math.min(displayProgress, 100)}%`,
                backgroundColor: 'var(--primary-color)',
                boxShadow: '0 0 10px var(--primary-color)'
              }"
            />
          </div>
          
          <Transition
            enter-active-class="transition-all duration-300"
            leave-active-class="transition-all duration-300"
            enter-from-class="opacity-0 translate-y-1"
            leave-to-class="opacity-0 -translate-y-1"
            mode="out-in"
          >
            <p
              :key="currentStep"
              class="mt-3 text-xs text-center"
              style="color: var(--text-tertiary)"
            >
              {{ currentStep }}
            </p>
          </Transition>
        </div>
      </div>

      <div class="absolute bottom-12 text-center animate-fade-in-delayed">
        <Transition
          enter-active-class="transition-opacity duration-500"
          leave-active-class="transition-opacity duration-500"
          mode="out-in"
        >
          <p
            :key="currentQuote"
            class="text-sm italic"
            style="color: var(--text-tertiary); opacity: 0.6"
          >
            "{{ quotes[currentQuote] }}"
          </p>
        </Transition>
        <p class="mt-4 text-xs" style="color: var(--text-tertiary)">
          © 2024 Starpact. All rights reserved.
        </p>
      </div>

      <div
        class="absolute inset-0 pointer-events-none animate-fade-in-delayed"
        style="opacity: 0.1; background-image: radial-gradient(circle at center, var(--primary-color) 1px, transparent 1px); background-size: 30px 30px"
      />
    </div>
  </Transition>
</template>

<style scoped>
@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-10px) rotate(5deg);
  }
}

@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}

.animate-spin-slow {
  animation: spin-slow 8s linear infinite;
}

.animate-scale-in {
  animation: scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes scale-in {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.5s ease-out 0.3s both;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 1s ease-out;
}

.animate-fade-in-delayed {
  animation: fade-in 1s ease-out 0.3s both;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
