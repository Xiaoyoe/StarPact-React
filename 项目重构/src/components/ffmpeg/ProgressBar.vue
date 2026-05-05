<script setup lang="ts">
defineProps<{
  value: number;
  label?: string;
  color?: 'blue' | 'green' | 'red' | 'purple';
}>();
</script>

<template>
  <div class="progress-bar-container">
    <div v-if="label" class="progress-label">{{ label }}</div>
    <div class="progress-bar">
      <div 
        class="progress-fill"
        :class="color || 'blue'"
        :style="{ width: `${Math.min(100, Math.max(0, value))}%` }"
      />
    </div>
    <span class="progress-value">{{ value }}%</span>
  </div>
</template>

<style scoped>
.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-label {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background-color: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-fill.blue {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}

.progress-fill.green {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.progress-fill.red {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.progress-fill.purple {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

.progress-value {
  font-size: 11px;
  color: var(--text-tertiary);
  min-width: 32px;
  text-align: right;
}
</style>
