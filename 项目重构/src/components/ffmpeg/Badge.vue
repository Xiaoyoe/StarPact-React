<script setup lang="ts">
defineProps<{
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan';
}>();
</script>

<template>
  <span class="badge" :class="color || 'blue'">
    <slot />
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 500;
}

.badge.blue {
  background-color: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.badge.green {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.badge.red {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.badge.yellow {
  background-color: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.badge.purple {
  background-color: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
}

.badge.cyan {
  background-color: rgba(6, 182, 212, 0.15);
  color: #06b6d4;
}
</style>
