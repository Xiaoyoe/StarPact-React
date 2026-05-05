<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Terminal as TerminalIcon, Copy, Plus, BookOpen, Save, FolderOpen, Trash2, Edit2, Check, X, FileText, Zap } from 'lucide-vue-next';

const templates = [
  { name: '视频转MP4 (H.264)', cmd: 'ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k output.mp4', category: '视频转换' },
  { name: '提取音频为MP3', cmd: 'ffmpeg -i input.mp4 -vn -c:a libmp3lame -b:a 320k output.mp3', category: '音频处理' },
  { name: '视频裁剪', cmd: 'ffmpeg -i input.mp4 -ss 00:01:00 -to 00:02:00 -c copy output.mp4', category: '视频编辑' },
  { name: '视频压缩 (2-pass)', cmd: 'ffmpeg -i input.mp4 -c:v libx264 -b:v 1M -pass 1 -f null /dev/null && ffmpeg -i input.mp4 -c:v libx264 -b:v 1M -pass 2 output.mp4', category: '视频压缩' },
  { name: '添加水印', cmd: "ffmpeg -i input.mp4 -vf \"drawtext=text='Watermark':fontsize=24:fontcolor=white@0.8:x=w-tw-10:y=h-th-10\" output.mp4", category: '视频编辑' },
  { name: '生成GIF', cmd: 'ffmpeg -i input.mp4 -ss 0 -t 5 -vf "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" output.gif', category: '格式转换' },
  { name: 'HLS切片', cmd: 'ffmpeg -i input.mp4 -c:v libx264 -c:a aac -hls_time 10 -hls_list_size 0 output.m3u8', category: '流媒体' },
  { name: '视频截图 (每秒)', cmd: 'ffmpeg -i input.mp4 -vf fps=1 frame_%04d.png', category: '截图' },
  { name: '画面裁切 (crop)', cmd: 'ffmpeg -i input.mp4 -vf "crop=1280:720:320:180" output.mp4', category: '视频编辑' },
  { name: '多音轨混合', cmd: 'ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 output.mp4', category: '音频处理' },
  { name: '视频变速2x', cmd: 'ffmpeg -i input.mp4 -vf "setpts=0.5*PTS" -af "atempo=2.0" output.mp4', category: '视频编辑' },
  { name: '缩略图拼图', cmd: 'ffmpeg -i input.mp4 -vf "select=not(mod(n\\,300)),scale=320:-1,tile=5x5" thumbnail.png', category: '截图' },
];

const docs = [
  { cat: '输入/输出', items: ['-i <file>', '-y (覆盖)', '-n (不覆盖)', '-f <format>', '-t <duration>', '-ss <start>', '-to <end>'] },
  { cat: '视频选项', items: ['-c:v <codec>', '-b:v <bitrate>', '-r <fps>', '-s <WxH>', '-vf <filter>', '-pix_fmt', '-preset', '-crf', '-vn (去除视频)'] },
  { cat: '音频选项', items: ['-c:a <codec>', '-b:a <bitrate>', '-ar <rate>', '-ac <channels>', '-af <filter>', '-an (去除音频)', '-vol <volume>'] },
  { cat: '视频滤镜', items: ['scale', 'crop', 'overlay', 'drawtext', 'subtitles', 'fps', 'setpts', 'transpose', 'hflip', 'vflip', 'eq', 'deinterlace'] },
  { cat: '音频滤镜', items: ['volume', 'atempo', 'afade', 'amix', 'loudnorm', 'aecho', 'equalizer', 'highpass', 'lowpass', 'afftdn'] },
];

interface CommandRecord {
  id: string;
  name: string;
  cmd: string;
  createdAt: number;
}

const command = ref('ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k output.mp4');
const commandRecords = ref<CommandRecord[]>([]);
const copied = ref(false);
const editingId = ref<string | null>(null);
const editingName = ref('');
const newRecordName = ref('');
const activeTemplateId = ref<number | null>(null);
const hoveredTemplateId = ref<number | null>(null);

onMounted(() => {
  const saved = localStorage.getItem('ffmpeg-command-records');
  if (saved) {
    try {
      commandRecords.value = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load command records:', e);
    }
  }
});

const saveToStorage = (records: CommandRecord[]) => {
  localStorage.setItem('ffmpeg-command-records', JSON.stringify(records));
};

const handleCopy = () => {
  navigator.clipboard.writeText(command.value).catch(() => {});
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
};

const handleAddRecord = () => {
  if (!command.value.trim()) {
    alert('请输入命令');
    return;
  }
  
  const name = newRecordName.value.trim() || `命令 ${commandRecords.value.length + 1}`;
  const newRecord: CommandRecord = {
    id: Date.now().toString(),
    name,
    cmd: command.value,
    createdAt: Date.now(),
  };
  
  const newRecords = [newRecord, ...commandRecords.value];
  commandRecords.value = newRecords;
  saveToStorage(newRecords);
  newRecordName.value = '';
};

const handleRemoveRecord = (id: string) => {
  const newRecords = commandRecords.value.filter(r => r.id !== id);
  commandRecords.value = newRecords;
  saveToStorage(newRecords);
};

const handleLoadRecord = (record: CommandRecord) => {
  command.value = record.cmd;
  activeTemplateId.value = null;
};

const handleEditName = (id: string, name: string) => {
  editingId.value = id;
  editingName.value = name;
};

const handleSaveName = (id: string) => {
  const newRecords = commandRecords.value.map(r => 
    r.id === id ? { ...r, name: editingName.value } : r
  );
  commandRecords.value = newRecords;
  saveToStorage(newRecords);
  editingId.value = null;
  editingName.value = '';
};

const handleClearAll = () => {
  commandRecords.value = [];
  saveToStorage([]);
};

const handleLoadTemplate = (index: number) => {
  command.value = templates[index].cmd;
  activeTemplateId.value = index;
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const groupedTemplates = computed(() => {
  const acc: Record<string, (typeof templates[0] & { index: number })[]> = {};
  templates.forEach((template, index) => {
    const category = template.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ ...template, index });
  });
  return acc;
});
</script>

<template>
  <div class="command-builder">
    <div class="header">
      <div class="title-row">
        <TerminalIcon :size="20" class="icon error" />
        <h2>命令行构建器</h2>
        <span class="badge error">高级</span>
        <span v-if="commandRecords.length > 0" class="badge blue">{{ commandRecords.length }} 条记录</span>
      </div>
    </div>

    <div class="content-grid">
      <div class="left-panel">
        <div class="card">
          <div class="card-header">
            <FileText :size="16" class="icon primary" />
            <span class="card-title">命令编辑</span>
          </div>
          <div class="card-body">
            <textarea
              v-model="command"
              class="command-input"
              placeholder="输入 FFmpeg 命令..."
              spellcheck="false"
            />
            <div class="input-row">
              <input
                type="text"
                v-model="newRecordName"
                placeholder="记录名称（可选）"
                class="name-input"
              />
              <button class="add-btn" @click="handleAddRecord">
                <Plus :size="14" />
                添加
              </button>
            </div>
            <div class="action-row">
              <button class="action-btn" @click="handleCopy">
                <Copy :size="14" />
                {{ copied ? '已复制!' : '复制命令' }}
              </button>
              <button class="action-btn" @click="command = ''; activeTemplateId = null">
                <Trash2 :size="14" />
                清空
              </button>
            </div>

            <div class="records-section">
              <div class="records-header">
                <Save :size="16" class="icon primary" />
                <span class="records-title">命令记录</span>
                <button v-if="commandRecords.length > 0" class="clear-all-btn" @click="handleClearAll">
                  清空全部
                </button>
              </div>
              
              <div v-if="commandRecords.length === 0" class="empty-records">
                <Save :size="32" class="empty-icon" />
                <p>暂无命令记录</p>
              </div>
              
              <div v-else class="records-list">
                <div 
                  v-for="record in commandRecords" 
                  :key="record.id"
                  class="record-item"
                  @click="handleLoadRecord(record)"
                >
                  <div class="record-content">
                    <div v-if="editingId === record.id" class="edit-row" @click.stop>
                      <input
                        type="text"
                        v-model="editingName"
                        class="edit-input"
                        autofocus
                      />
                      <button class="edit-btn save" @click="handleSaveName(record.id)">
                        <Check :size="12" />
                      </button>
                      <button class="edit-btn cancel" @click="editingId = null">
                        <X :size="12" />
                      </button>
                    </div>
                    <div v-else class="record-name-row">
                      <span class="record-name">{{ record.name }}</span>
                      <button 
                        class="edit-name-btn"
                        @click.stop="handleEditName(record.id, record.name)"
                      >
                        <Edit2 :size="10" />
                      </button>
                    </div>
                    <div class="record-cmd">{{ record.cmd.substring(0, 50) }}...</div>
                  </div>
                  <button 
                    class="remove-btn"
                    @click.stop="handleRemoveRecord(record.id)"
                  >
                    <Trash2 :size="12" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="card">
          <div class="card-header">
            <FolderOpen :size="16" class="icon warning" />
            <span class="card-title">命令模板</span>
            <span class="badge orange">{{ templates.length }} 个</span>
          </div>
          <div class="card-body">
            <div class="templates-section">
              <div v-for="(categoryTemplates, category) in groupedTemplates" :key="category" class="template-category">
                <div class="category-header">
                  <Zap :size="14" class="icon warning" />
                  <span class="category-title">{{ category }}</span>
                </div>
                <div class="template-list">
                  <div
                    v-for="template in categoryTemplates"
                    :key="template.index"
                    :class="['template-item', { 
                      active: activeTemplateId === template.index,
                      hovered: hoveredTemplateId === template.index 
                    }]"
                    @click="handleLoadTemplate(template.index)"
                    @mouseenter="hoveredTemplateId = template.index"
                    @mouseleave="hoveredTemplateId = null"
                  >
                    <div class="template-info">
                      <div class="template-name">{{ template.name }}</div>
                      <div class="template-cmd">{{ template.cmd.substring(0, 40) }}...</div>
                    </div>
                    <div class="load-btn">加载</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="docs-section">
              <div class="docs-header">
                <BookOpen :size="16" class="icon info" />
                <span class="docs-title">参数参考</span>
              </div>
              <div class="docs-list">
                <div v-for="(doc, i) in docs" :key="i" class="doc-item">
                  <div class="doc-category">{{ doc.cat }}</div>
                  <div class="doc-items">
                    <button
                      v-for="(item, j) in doc.items"
                      :key="j"
                      class="doc-btn"
                      @click="command += ' ' + item.split(' ')[0]"
                    >
                      {{ item }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.command-builder {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.header {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon {
  color: var(--primary-color);
}

.icon.error {
  color: #ef4444;
}

.icon.warning {
  color: var(--warning-color);
}

.icon.info {
  color: #3b82f6;
}

h2 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 9999px;
}

.badge.error {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.badge.blue {
  background-color: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.badge.orange {
  background-color: rgba(245, 158, 11, 0.15);
  color: var(--warning-color);
}

.content-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-height: 0;
  overflow: hidden;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.command-input {
  width: 100%;
  min-height: 120px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  font-family: monospace;
  resize: vertical;
  outline: none;
  margin-bottom: 16px;
}

.command-input:focus {
  border-color: var(--primary-color);
}

.input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.name-input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.name-input:focus {
  border-color: var(--primary-color);
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, var(--primary-color), #8b5cf6);
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover {
  transform: scale(1.05);
}

.action-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: var(--hover-bg);
}

.records-section {
  border-top: 1px solid var(--border-color);
  padding-top: 16px;
}

.records-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.records-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.clear-all-btn {
  margin-left: auto;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  cursor: pointer;
}

.empty-records {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--text-tertiary);
}

.empty-icon {
  opacity: 0.5;
  margin-bottom: 8px;
}

.empty-records p {
  font-size: 12px;
  margin: 0;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.record-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.record-item:hover {
  transform: scale(1.01);
}

.record-content {
  flex: 1;
  min-width: 0;
}

.edit-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.edit-input {
  flex: 1;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--primary-color);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.edit-btn {
  padding: 4px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.edit-btn.save {
  background-color: transparent;
  color: #10b981;
}

.edit-btn.cancel {
  background-color: transparent;
  color: var(--text-tertiary);
}

.record-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.record-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-name-btn {
  padding: 2px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.record-item:hover .edit-name-btn {
  opacity: 1;
}

.record-cmd {
  font-size: 10px;
  font-family: monospace;
  color: var(--text-tertiary);
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

.remove-btn {
  padding: 4px;
  border-radius: 4px;
  border: none;
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.record-item:hover .remove-btn {
  opacity: 1;
}

.templates-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.template-category {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.template-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.template-item:hover,
.template-item.hovered {
  background-color: var(--bg-tertiary);
  transform: scale(1.01);
}

.template-item.active {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
}

.template-info {
  flex: 1;
  min-width: 0;
}

.template-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.template-item.active .template-name {
  color: var(--primary-color);
}

.template-cmd {
  font-size: 10px;
  font-family: monospace;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.load-btn {
  padding: 4px 8px;
  border-radius: 6px;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 500;
  opacity: 0;
  transition: all 0.2s;
  flex-shrink: 0;
}

.template-item:hover .load-btn,
.template-item.active .load-btn {
  opacity: 1;
}

.template-item.active .load-btn {
  background-color: var(--primary-color);
  color: white;
}

.docs-section {
  border-top: 1px solid var(--border-color);
  padding-top: 16px;
}

.docs-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.docs-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.docs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doc-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.doc-category {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-color);
}

.doc-items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.doc-btn {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 10px;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.2s;
}

.doc-btn:hover {
  transform: scale(1.05);
}
</style>
