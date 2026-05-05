<script setup lang="ts">
defineProps<{
  lines: string[];
  maxLines?: number;
}>();
</script>

<template>
  <div class="terminal">
    <div 
      v-for="(line, index) in (maxLines ? lines.slice(-maxLines) : lines)" 
      :key="index"
      class="terminal-line"
      :class="{
        error: line.startsWith('[error]'),
        success: line.startsWith('[done]'),
        info: line.startsWith('[info]'),
        warn: line.startsWith('[warn]'),
        ffmpeg: line.startsWith('[ffmpeg]')
      }"
    >
      {{ line }}
    </div>
    <div v-if="lines.length === 0" class="terminal-empty">
      暂无日志
    </div>
  </div>
</template>

<style scoped>
.terminal {
  background-color: var(--bg-tertiary);
  border-radius: 8px;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
}

.terminal-line {
  color: var(--text-secondary);
  word-break: break-all;
}

.terminal-line.error {
  color: #ef4444;
}

.terminal-line.success {
  color: #10b981;
}

.terminal-line.info {
  color: var(--text-tertiary);
}

.terminal-line.warn {
  color: #f59e0b;
}

.terminal-line.ffmpeg {
  color: #8b5cf6;
}

.terminal-empty {
  color: var(--text-tertiary);
  text-align: center;
  padding: 20px;
}
</style>
