<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { ChevronUp, ChevronDown } from 'lucide-vue-next';
import type { ChatMessage } from '@/stores/useConversationStore';

interface Props {
  messages: ChatMessage[];
  containerRef: HTMLElement | null;
}

const props = defineProps<Props>();

const hoveredPoint = ref<string | null>(null);
const lastVisibleIndex = ref<number>(-1);
const isAtBottom = ref(false);
const isNavAtBottom = ref(false);
const selectedPointId = ref<string | null>(null);
const navPointsContainer = ref<HTMLElement | null>(null);
const pointRefs = ref<Map<string, HTMLElement>>(new Map());

const navPoints = computed(() => {
  return props.messages
    .filter(msg => msg.role === 'user')
    .map(msg => ({
      id: msg.id,
      messageId: msg.id,
      content: msg.content,
      timestamp: msg.timestamp,
    }));
});

const truncateText = (text: string, maxLength: number = 50) => {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

const scrollToMessage = (messageId: string) => {
  selectedPointId.value = messageId;
  if (!props.containerRef) return;
  const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  if (messageElement && props.containerRef) {
    const containerRect = props.containerRef.getBoundingClientRect();
    const messageRect = messageElement.getBoundingClientRect();
    const headerOffset = 100;
    const scrollTop = props.containerRef.scrollTop + messageRect.top - containerRect.top - headerOffset;
    props.containerRef.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    });
  }
};

const scrollToTop = () => {
  if (!props.containerRef) return;
  props.containerRef.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
};

const scrollToBottom = () => {
  if (!props.containerRef) return;
  props.containerRef.scrollTo({
    top: props.containerRef.scrollHeight,
    behavior: 'smooth'
  });
};

const pointStatus = computed(() => {
  const totalPoints = navPoints.value.length;
  if (totalPoints === 0) return [];
  
  return navPoints.value.map((point, index) => {
    const isLast = index === totalPoints - 1;
    
    if (isLast && (selectedPointId.value === point.id || isAtBottom.value)) {
      return 'selected-bottom';
    }
    
    if (isLast && isNavAtBottom.value) {
      return 'bottom';
    }
    
    if (index === lastVisibleIndex.value && lastVisibleIndex.value < totalPoints - 1) {
      return 'more';
    }
    
    return 'normal';
  });
});

let observer: IntersectionObserver | null = null;

const setupObserver = () => {
  if (!navPointsContainer.value || navPoints.value.length === 0) return;

  const visiblePoints = new Set<string>();
  let lastVisibleIdx = -1;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.getAttribute('data-nav-point-id');
        if (id) {
          if (entry.isIntersecting) {
            visiblePoints.add(id);
          } else {
            visiblePoints.delete(id);
          }
        }
      });

      let newLastVisibleIdx = -1;
      navPoints.value.forEach((point, index) => {
        if (visiblePoints.has(point.id)) {
          newLastVisibleIdx = index;
        }
      });

      if (newLastVisibleIdx !== lastVisibleIdx) {
        lastVisibleIdx = newLastVisibleIdx;
        lastVisibleIndex.value = newLastVisibleIdx;
      }
    },
    {
      root: navPointsContainer.value,
      threshold: 0.5,
    }
  );

  pointRefs.value.forEach((el) => {
    observer?.observe(el);
  });
};

const handleScroll = () => {
  if (!props.containerRef) return;

  const { scrollTop, scrollHeight, clientHeight } = props.containerRef;
  const bottomOffset = 150;
  const scrollPosition = scrollTop + clientHeight;
  const isBottom = scrollPosition >= scrollHeight - bottomOffset || scrollPosition >= scrollHeight - 10;
  isAtBottom.value = isBottom;
};

const handleNavScroll = () => {
  if (!navPointsContainer.value) return;

  const { scrollTop, scrollHeight, clientHeight } = navPointsContainer.value;
  const isBottom = scrollTop + clientHeight >= scrollHeight - 5;
  isNavAtBottom.value = isBottom;
};

const registerPointRef = (id: string) => (el: any) => {
  if (el) {
    pointRefs.value.set(id, el);
  } else {
    pointRefs.value.delete(id);
  }
};

watch(() => props.messages, async () => {
  await nextTick();
  if (observer) {
    observer.disconnect();
  }
  setupObserver();
}, { deep: true });

watch(() => props.containerRef, (newRef, oldRef) => {
  if (oldRef) {
    oldRef.removeEventListener('scroll', handleScroll);
  }
  if (newRef) {
    newRef.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }
}, { immediate: true });

watch(navPointsContainer, (newContainer, oldContainer) => {
  if (oldContainer) {
    oldContainer.removeEventListener('scroll', handleNavScroll);
  }
  if (newContainer) {
    newContainer.addEventListener('scroll', handleNavScroll, { passive: true });
    handleNavScroll();
  }
}, { immediate: true });

onMounted(() => {
  setupObserver();
  if (navPointsContainer.value) {
    navPointsContainer.value.addEventListener('scroll', handleNavScroll, { passive: true });
    handleNavScroll();
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
  if (props.containerRef) {
    props.containerRef.removeEventListener('scroll', handleScroll);
  }
  if (navPointsContainer.value) {
    navPointsContainer.value.removeEventListener('scroll', handleNavScroll);
  }
});
</script>

<template>
  <div v-if="navPoints.length > 0" class="quick-nav">
    <button
      @click="scrollToTop"
      class="nav-button"
      title="跳转到顶部"
    >
      <ChevronUp :size="16" />
    </button>

    <div class="nav-points-container" ref="navPointsContainer">
      <div
        v-for="(point, index) in navPoints"
        :key="point.id"
        :ref="registerPointRef(point.id)"
        :data-nav-point-id="point.id"
        class="nav-point"
        :class="{
          hovered: hoveredPoint === point.id,
          'has-more': pointStatus[index] === 'more',
          'at-bottom': pointStatus[index] === 'bottom',
          'selected-bottom': pointStatus[index] === 'selected-bottom'
        }"
        @click="scrollToMessage(point.messageId)"
        @mouseenter="hoveredPoint = point.id"
        @mouseleave="hoveredPoint = null"
      >
        <div class="nav-point-indicator"></div>
        <div class="nav-point-tooltip">
          #{{ index + 1 }} {{ truncateText(point.content) }}
        </div>
      </div>
    </div>

    <button
      @click="scrollToBottom"
      class="nav-button"
      title="跳转到底部"
    >
      <ChevronDown :size="16" />
    </button>
  </div>
</template>

<style scoped>
.quick-nav {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 50;
  pointer-events: none;
}

.quick-nav > * {
  pointer-events: auto;
}

.nav-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-button:hover {
  background-color: var(--primary-light);
  color: var(--primary-color);
  border-color: var(--primary-color);
  transform: scale(1.1);
  box-shadow: 0 0 12px rgba(var(--primary-color-rgb), 0.3);
}

.nav-points-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: visible;
  padding: 4px 0;
  padding-left: 220px;
  margin-left: -220px;
  scrollbar-gutter: stable;
  scrollbar-width: none;
  -ms-overflow-style: none;
  position: relative;
  pointer-events: none;
}

.nav-points-container::-webkit-scrollbar {
  display: none;
}

.nav-point {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 8px 10px;
  transition: all 0.2s ease;
  pointer-events: auto;
}

.nav-point::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  width: 2px;
  height: 8px;
  background-color: var(--border-color);
  transform: translateX(-50%);
  transition: all 0.2s ease;
}

.nav-point::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 2px;
  height: 8px;
  background-color: var(--border-color);
  transform: translateX(-50%);
  transition: all 0.2s ease;
}

.nav-point:first-child::before {
  display: none;
}

.nav-point:last-child::after {
  display: none;
}

.nav-point-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--text-tertiary);
  transition: all 0.25s ease;
  position: relative;
  z-index: 1;
}

.nav-point:hover .nav-point-indicator {
  background-color: var(--primary-color);
  transform: scale(1.25);
  box-shadow: 0 0 10px var(--primary-color);
}

.nav-point:hover::before,
.nav-point:hover::after {
  background-color: var(--primary-light);
}

.nav-point.hovered .nav-point-indicator {
  background-color: var(--primary-color);
  transform: scale(1.25);
  box-shadow: 0 0 10px var(--primary-color);
}

.nav-point.hovered::before,
.nav-point.hovered::after {
  background-color: var(--primary-light);
}

.nav-point.has-more .nav-point-indicator {
  background-color: var(--error-color);
  animation: pulse-red 1.5s ease-in-out infinite;
}

.nav-point.has-more::after {
  background-color: var(--error-color);
  opacity: 0.5;
}

.nav-point.at-bottom .nav-point-indicator {
  background-color: #10b981 !important;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
  transform: scale(1.2);
}

.nav-point.at-bottom::before,
.nav-point.at-bottom::after {
  background-color: #10b981 !important;
  opacity: 0.6;
}

.nav-point.selected-bottom .nav-point-indicator {
  background-color: #8b5cf6 !important;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.6);
  transform: scale(1.2);
}

.nav-point.selected-bottom::before,
.nav-point.selected-bottom::after {
  background-color: #8b5cf6 !important;
  opacity: 0.6;
}

@keyframes pulse-red {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
  }
}

.nav-point-tooltip {
  position: absolute;
  left: auto;
  right: 100%;
  margin-right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s ease;
  z-index: 10;
}

.nav-point:hover .nav-point-tooltip {
  opacity: 1;
}

@media (max-width: 768px) {
  .quick-nav {
    right: 10px;
  }
}

@media (max-width: 480px) {
  .quick-nav {
    right: 8px;
  }
  
  .nav-button {
    width: 28px;
    height: 28px;
  }
}
</style>
