import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileText, Download, Save, RotateCcw, Copy, Info,
  Sun, Moon, HelpCircle, AlertCircle, CheckCircle,
  X, SlidersHorizontal, Eye, Play, Braces
} from 'lucide-react';
import { useStore, generateId } from '@/store';
import { CodeEditor } from '@/components/CodeEditor';
import { motion, AnimatePresence } from 'framer-motion';

// ===================== TYPES =====================
export interface IniParameter {
  key: string;
  displayKey: string;
  value: string;
  section: string;
  min: number;
  max: number;
  step: number;
  isNumeric: boolean;
}

export interface IniData {
  fromConfig: string;
  originalFromConfig: string;
  systemContent: string;
  templateContent: string;
  originalTemplateContent: string;
  parameters: IniParameter[];
}

// ===================== HELPERS =====================

function getTimestamp(): string {
  const now = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

const KNOWN_PARAMS: Record<string, { min: number; max: number; step: number; desc: string }> = {
  temperature: { min: 0, max: 2, step: 0.01, desc: '控制生成文本的随机性' },
  top_p: { min: 0, max: 1, step: 0.01, desc: '核采样概率阈值' },
  top_k: { min: 0, max: 200, step: 1, desc: '每步考虑的最高概率词数' },
  max_tokens: { min: 1, max: 128000, step: 1, desc: '最大生成令牌数' },
  repeat_penalty: { min: 0, max: 5, step: 0.01, desc: '重复惩罚系数' },
  presence_penalty: { min: -2, max: 2, step: 0.01, desc: '存在惩罚' },
  frequency_penalty: { min: -2, max: 2, step: 0.01, desc: '频率惩罚' },
  seed: { min: 0, max: 999999, step: 1, desc: '随机种子' },
  num_ctx: { min: 128, max: 131072, step: 128, desc: '上下文窗口大小' },
  num_predict: { min: -1, max: 128000, step: 1, desc: '预测令牌数' },
  mirostat: { min: 0, max: 2, step: 1, desc: 'Mirostat采样模式' },
  mirostat_eta: { min: 0, max: 1, step: 0.01, desc: 'Mirostat学习率' },
  mirostat_tau: { min: 0, max: 10, step: 0.1, desc: 'Mirostat目标熵' },
  tfs_z: { min: 0, max: 2, step: 0.01, desc: 'Tail Free Sampling参数' },
  num_thread: { min: 1, max: 128, step: 1, desc: '线程数' },
};

// ===================== INI PARSER =====================

export function parseIniContent(content: string): IniData {
  const lines = content.split('\n');
  let fromConfig = '';
  let systemContent = '';
  let templateContent = '';
  const parameters: IniParameter[] = [];
  let inSystem = false;
  let inTemplate = false;
  const systemLines: string[] = [];
  const templateLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (inSystem && trimmedLine === '"""') {
      inSystem = false;
      systemContent = systemLines.join('\n');
      continue;
    }
    if (inTemplate && trimmedLine === '"""') {
      inTemplate = false;
      templateContent = templateLines.join('\n');
      continue;
    }
    if (inSystem) { systemLines.push(line); continue; }
    if (inTemplate) { templateLines.push(line); continue; }

    if (trimmedLine.toUpperCase().startsWith('FROM ')) {
      fromConfig = trimmedLine;
      continue;
    }
    if (trimmedLine.toUpperCase().startsWith('SYSTEM ')) {
      const systemPart = trimmedLine.substring(7).trim();
      if (systemPart.startsWith('"""')) {
        const afterQuotes = systemPart.substring(3);
        if (afterQuotes) systemLines.push(afterQuotes);
        inSystem = true;
      } else {
        systemContent = systemPart;
      }
      continue;
    }
    if (trimmedLine.toUpperCase().startsWith('TEMPLATE ')) {
      const templatePart = trimmedLine.substring(9).trim();
      if (templatePart.startsWith('"""')) {
        const afterQuotes = templatePart.substring(3);
        if (afterQuotes) templateLines.push(afterQuotes);
        inTemplate = true;
      } else {
        templateContent = templatePart;
      }
      continue;
    }
    if (trimmedLine.toUpperCase().startsWith('PARAMETER ') && !trimmedLine.startsWith('#') && !trimmedLine.startsWith(';')) {
      const paramContent = trimmedLine.substring(10).trim();
      const parts = paramContent.split(/\s+/);
      if (parts.length >= 2) {
        const key = parts[0];
        const value = parts.slice(1).join(' ');
        const known = KNOWN_PARAMS[key.toLowerCase()];
        parameters.push({
          key, displayKey: key, value, section: 'PARAMETER',
          min: known?.min ?? 0,
          max: known?.max ?? (isNaN(Number(value)) ? 0 : Math.max(Number(value) * 2, 1)),
          step: known?.step ?? 0.01,
          isNumeric: !isNaN(Number(value)),
        });
      }
      continue;
    }
    if (trimmedLine.includes('=') && !trimmedLine.startsWith('#') && !trimmedLine.startsWith(';')) {
      const eqIdx = trimmedLine.indexOf('=');
      const key = trimmedLine.substring(0, eqIdx).trim();
      const value = trimmedLine.substring(eqIdx + 1).trim();
      if (key) {
        const known = KNOWN_PARAMS[key.toLowerCase()];
        parameters.push({
          key, displayKey: key, value,
          section: key.includes('.') ? key.split('.')[0] : 'PARAMETER',
          min: known?.min ?? 0,
          max: known?.max ?? (isNaN(Number(value)) ? 0 : Math.max(Number(value) * 2, 1)),
          step: known?.step ?? 0.01,
          isNumeric: !isNaN(Number(value)),
        });
      }
    }
  }

  if (inSystem && systemLines.length > 0) systemContent = systemLines.join('\n');
  if (inTemplate && templateLines.length > 0) templateContent = templateLines.join('\n');

  return {
    fromConfig, originalFromConfig: fromConfig, systemContent, templateContent, originalTemplateContent: templateContent, parameters,
  };
}

export function buildIniContent(data: IniData): string {
  const parts: string[] = [];
  if (data.fromConfig) parts.push(data.fromConfig);
  if (data.systemContent) {
    parts.push('');
    if (data.systemContent.includes('\n')) {
      parts.push('SYSTEM """');
      parts.push(data.systemContent);
      parts.push('"""');
    } else {
      parts.push('SYSTEM ' + data.systemContent);
    }
  }
  if (data.parameters.length > 0) {
    parts.push('');
    parts.push('# Model parameters');
    data.parameters.forEach(param => {
      parts.push('PARAMETER ' + param.key + ' ' + param.value);
    });
  }
  if (data.templateContent) {
    parts.push('');
    if (data.templateContent.includes('\n')) {
      parts.push('TEMPLATE """');
      parts.push(data.templateContent);
      parts.push('"""');
    } else {
      parts.push('TEMPLATE ' + data.templateContent);
    }
  }
  return parts.join('\n');
}

export function getSampleIni(): string {
  return [
    'FROM llama3.2:latest',
    '',
    'SYSTEM """',
    'You are a helpful assistant that provides detailed and accurate information.',
    'Respond in Chinese when asked questions in Chinese.',
    'Always be polite, concise, and informative.',
    '"""',
    '',
    '# Model parameters',
    'PARAMETER temperature 0.7',
    'PARAMETER top_p 0.95',
    'PARAMETER top_k 40',
    'PARAMETER max_tokens 4096',
    'PARAMETER repeat_penalty 1.1',
    '',
    'TEMPLATE """',
    '{{ .System }}',
    '',
    'User: {{ .Prompt }}',
    '',
    'Assistant: {{ .Response }}',
    '"""',
  ].join('\n');
}

// ===================== TOAST =====================
interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info'; }
let _toastId = 0;

function ToastContainer({ toasts, onRemove }: { toasts: ToastMsg[]; onRemove: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      <AnimatePresence>
        {toasts.map(t => {
          const bgKey = t.type === 'success' ? '--toast-success-bg' : t.type === 'error' ? '--toast-error-bg' : '--toast-info-bg';
          const textKey = t.type === 'success' ? '--toast-success-text' : t.type === 'error' ? '--toast-error-text' : '--toast-info-text';
          const borderKey = t.type === 'success' ? '--toast-success-border' : t.type === 'error' ? '--toast-error-border' : '--toast-info-border';
          const IconComp = t.type === 'success' ? CheckCircle : t.type === 'error' ? AlertCircle : Info;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              onClick={() => onRemove(t.id)}
              style={{
                pointerEvents: 'auto', padding: '10px 16px', borderRadius: 10,
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                boxShadow: 'var(--shadow-lg)',
                background: 'var(' + bgKey + ')',
                color: 'var(' + textKey + ')',
                borderLeft: '3px solid var(' + borderKey + ')',
                display: 'flex', alignItems: 'center', gap: 8,
                backdropFilter: 'blur(8px)', maxWidth: 340,
              }}
            >
              <IconComp size={15} />
              <span>{t.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ===================== HELP MODAL =====================
function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--bg-modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-modal)', borderRadius: 16, padding: 28, maxWidth: 540, width: '90%', maxHeight: '80vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-primary)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>使用帮助</h2>
          <button onClick={onClose} style={{ background: 'var(--btn-icon-bg)', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--text-secondary)' }}>
          <HelpSection title="📂 文件管理">
            <li><b>上传文件</b> — 支持 .ini / .txt / .modelfile 格式</li>
            <li><b>加载示例</b> — 快速加载示例配置文件</li>
            <li><b>导出文件</b> — 保存编辑后的 INI 文件</li>
            <li><b>重置修改</b> — 恢复为上次上传的原始内容</li>
          </HelpSection>
          <HelpSection title="✏️ 编辑器">
            <li>左侧代码编辑器支持语法高亮和行号</li>
            <li>支持 Tab 缩进、Shift+Tab 反缩进</li>
            <li>支持 Ctrl+D 复制当前行</li>
            <li>支持 Enter 自动缩进</li>
          </HelpSection>
          <HelpSection title="🎛️ 参数面板">
            <li>右侧面板展示解析后的参数</li>
            <li>通过滑块或输入框调整数值参数</li>
            <li>参数修改会实时同步到编辑器</li>
          </HelpSection>
          <HelpSection title="🎨 快捷键">
            <li><kbd>Tab</kbd> — 插入缩进</li>
            <li><kbd>Shift+Tab</kbd> — 减少缩进</li>
            <li><kbd>Ctrl/Cmd+D</kbd> — 复制当前行</li>
          </HelpSection>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 4 }}>{title}</h3>
      <ul style={{ paddingLeft: 18, listStyle: 'disc' }}>{children}</ul>
    </div>
  );
}

// ===================== SPLITTER =====================
function Splitter({ onDrag }: { onDrag: (dx: number) => void }) {
  const dragging = useRef(false);
  const lastX = useRef(0);
  const [hovered, setHovered] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastX.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const move = (ev: MouseEvent) => {
      if (!dragging.current) return;
      onDrag(ev.clientX - lastX.current);
      lastX.current = ev.clientX;
    };
    const up = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 6, minWidth: 6, cursor: 'col-resize',
        background: hovered ? 'var(--bg-splitter-hover)' : 'var(--bg-splitter)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: 2, height: 32, borderRadius: 1,
        background: hovered ? 'var(--text-inverse)' : 'var(--text-tertiary)',
        opacity: hovered ? 0.9 : 0.3, transition: 'all 0.15s',
      }} />
    </div>
  );
}

// ===================== TOOLBAR BUTTON =====================
function ToolBtn({
  children, onClick, title, variant = 'secondary', disabled = false,
}: {
  children: React.ReactNode; onClick: () => void; title?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const bgMap: Record<string, string> = {
    primary: 'var(--btn-primary-bg)', secondary: 'var(--btn-secondary-bg)',
    danger: 'var(--btn-danger-bg)', success: 'var(--btn-success-bg)',
    warning: 'var(--btn-warning-bg)', ghost: 'var(--btn-ghost-bg)',
  };
  const hoverMap: Record<string, string> = {
    primary: 'var(--btn-primary-hover)', secondary: 'var(--btn-secondary-hover)',
    danger: 'var(--btn-danger-hover)', success: 'var(--btn-success-hover)',
    warning: 'var(--btn-warning-hover)', ghost: 'var(--btn-ghost-hover)',
  };
  const colorMap: Record<string, string> = {
    primary: 'var(--btn-primary-text)', secondary: 'var(--btn-secondary-text)',
    danger: 'var(--btn-danger-text)', success: 'var(--btn-success-text)',
    warning: 'var(--btn-warning-text)', ghost: 'var(--btn-ghost-text)',
  };

  return (
    <button
      onClick={disabled ? undefined : onClick} disabled={disabled} title={title}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        padding: '5px 12px', borderRadius: 6, border: '1px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 500,
        background: disabled ? 'var(--btn-disabled-bg)' : (hovered ? hoverMap[variant] : bgMap[variant]),
        color: disabled ? 'var(--btn-disabled-text)' : colorMap[variant],
        whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5,
        lineHeight: 1, transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

// ===================== PARAMETER CONTROL =====================
function ParameterControl({ param, onChange, fontSize }: {
  param: IniParameter; onChange: (key: string, value: string) => void; fontSize: number;
}) {
  const [localValue, setLocalValue] = useState(param.value);
  useEffect(() => { setLocalValue(param.value); }, [param.value]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    onChange(param.key, e.target.value);
  };
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    onChange(param.key, e.target.value);
  };

  const numVal = parseFloat(localValue);
  const isValidNum = !isNaN(numVal);
  const pct = isValidNum ? Math.min(100, Math.max(0, ((numVal - param.min) / (param.max - param.min)) * 100)) : 0;
  const desc = KNOWN_PARAMS[param.key.toLowerCase()]?.desc;

  return (
    <div style={{
      padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 8,
      border: '1px solid var(--border-color)', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: param.isNumeric ? 10 : 6 }}>
        <div>
          <span style={{ fontSize: fontSize, fontWeight: 600, color: 'var(--text-heading)', fontFamily: "'Consolas', monospace" }}>
            {param.displayKey}
          </span>
          {desc && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>{desc}</span>
          )}
        </div>
      </div>

      {param.isNumeric ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ width: '100%', height: 4, background: 'var(--border-color)', borderRadius: 2 }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: pct + '%', height: 4, background: 'linear-gradient(90deg, var(--primary-color), var(--primary-dark))', borderRadius: 2, transition: 'width 0.15s' }} />
            <div style={{ position: 'absolute', top: -5, left: pct + '%', transform: 'translateX(-50%)', width: 14, height: 14, background: 'var(--primary-color)', borderRadius: '50%', boxShadow: '0 2px 6px rgba(79,110,247,0.3)', transition: 'left 0.15s', zIndex: 1 }} />
            <input type="range" min={param.min} max={param.max} step={param.step}
              value={isValidNum ? numVal : param.min} onChange={handleSlider}
              style={{ position: 'absolute', top: -10, left: 0, width: '100%', height: 24, opacity: 0, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 6, fontFamily: 'monospace' }}>
              <span>{param.min}</span>
              <span>{param.max}</span>
            </div>
          </div>
          <input type="text" value={localValue} onChange={handleInput}
            style={{
              width: 80, padding: '6px 10px', border: '1px solid var(--border-color)',
              borderRadius: 6, fontSize: fontSize - 1, textAlign: 'center',
              background: 'var(--bg-primary)', color: 'var(--text-primary)',
              fontWeight: 600, fontFamily: 'monospace', outline: 'none',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
          />
        </div>
      ) : (
        <input type="text" value={localValue} onChange={handleInput}
          style={{
            width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)',
            borderRadius: 6, fontSize: fontSize - 1, background: 'var(--bg-primary)',
            color: 'var(--text-primary)', fontFamily: 'monospace', outline: 'none',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        />
      )}
    </div>
  );
}

// ===================== TAB BUTTON =====================
function TabButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', fontSize: 12, fontWeight: active ? 600 : 400,
      color: active ? 'var(--text-accent)' : 'var(--text-tertiary)',
      background: active ? 'var(--bg-accent-subtle)' : 'transparent',
      border: 'none', borderBottom: active ? '2px solid var(--primary-color)' : '2px solid transparent',
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
      transition: 'all 0.15s',
    }}>
      {icon}
      {label}
    </button>
  );
}

// ===================== PANEL SECTION =====================
function PanelSection({ title, icon, badge, children }: {
  title: string; icon: string; badge?: number; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 8,
      border: '1px solid var(--border-card)', marginBottom: 10,
      overflow: 'hidden',
    }}>
      <div onClick={() => setOpen(!open)} style={{
        padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', userSelect: 'none', background: 'var(--bg-section-header)',
        borderBottom: open ? '1px solid var(--border-primary)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-heading)' }}>{title}</span>
          {badge !== undefined && (
            <span style={{
              fontSize: 10, padding: '0px 6px', borderRadius: 10,
              background: 'var(--bg-badge)', color: 'var(--text-inverse)', fontWeight: 600,
            }}>{badge}</span>
          )}
        </div>
        <span style={{
          fontSize: 9, color: 'var(--text-tertiary)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s', display: 'inline-block',
        }}>▼</span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: 12 }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===================== STRUCT ITEM =====================
function StructItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ color, fontWeight: 600, minWidth: 100, fontSize: 11 }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)', fontSize: 11, wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

// ===================== STAT CARD =====================
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8,
      border: '1px solid var(--border-color)', textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', fontFamily: 'monospace' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ===================== MAIN COMPONENT =====================
export function IniConfigPage() {
  const { addLog } = useStore();

  const [iniData, setIniData] = useState<IniData | null>(null);
  const [originalRaw, setOriginalRaw] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [helpVisible, setHelpVisible] = useState(false);
  const [highlightLine, setHighlightLine] = useState<number | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(55);
  const [rightTab, setRightTab] = useState<'params' | 'preview'>('params');
  const [editorContent, setEditorContent] = useState('');
  const [currentFileName, setCurrentFileName] = useState('');
  const [isModified, setIsModified] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const syncFromEditor = useRef(true);
  const syncFromPanel = useRef(false);

  // ---- Toast ----
  const addToast = useCallback((text: string, type: ToastMsg['type'] = 'info', duration = 3000) => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  const removeToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // ---- Theme ----
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  // ---- Sync editor content -> iniData ----
  useEffect(() => {
    if (!syncFromEditor.current) {
      syncFromEditor.current = true;
      return;
    }
    if (editorContent && enabled) {
      const parsed = parseIniContent(editorContent);
      syncFromPanel.current = false;
      setIniData(prev => {
        if (!prev) return parsed;
        return { ...parsed, originalFromConfig: prev.originalFromConfig, originalTemplateContent: prev.originalTemplateContent };
      });
      setIsModified(editorContent !== originalRaw);
    }
  }, [editorContent, enabled, originalRaw]);

  // ---- Sync iniData -> editor content (from panel changes) ----
  useEffect(() => {
    if (syncFromPanel.current && iniData) {
      syncFromEditor.current = false;
      const built = buildIniContent(iniData);
      setEditorContent(built);
      setIsModified(built !== originalRaw);
      syncFromPanel.current = false;
    }
  }, [iniData, originalRaw]);

  // ---- Auto-save & auto-load ----
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ini_config_autosave');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.raw) {
          const data = parseIniContent(parsed.raw);
          setIniData(data);
          setOriginalRaw(parsed.originalRaw || parsed.raw);
          setEditorContent(parsed.raw);
          setEnabled(true);
          addToast('已自动加载上次的内容', 'info');
          addLog({ id: generateId(), level: 'info', message: '自动加载INI配置', timestamp: Date.now(), module: 'IniConfig' });
        }
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!iniData) return;
    const interval = setInterval(() => {
      try {
        const content = buildIniContent(iniData);
        localStorage.setItem('ini_config_autosave', JSON.stringify({ raw: content, originalRaw, time: new Date().toISOString() }));
      } catch { /* ignore */ }
    }, 60000);
    return () => clearInterval(interval);
  }, [iniData, originalRaw]);

  // ---- File upload ----
  const handleUpload = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const data = parseIniContent(content);
        syncFromPanel.current = false;
        setIniData(data);
        setOriginalRaw(content);
        setEditorContent(content);
        setEnabled(true);
        setHighlightLine(null);
        setCurrentFileName(file.name);
        setIsModified(false);
        addToast('文件上传成功：' + file.name, 'success');
        addLog({ id: generateId(), level: 'info', message: '上传INI文件: ' + file.name, timestamp: Date.now(), module: 'IniConfig' });
      } catch (err) {
        addToast('文件解析失败', 'error');
        addLog({ id: generateId(), level: 'error', message: '文件解析失败: ' + err, timestamp: Date.now(), module: 'IniConfig' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [addToast, addLog]);

  // ---- Load sample ----
  const handleLoadSample = useCallback(() => {
    const content = getSampleIni();
    const data = parseIniContent(content);
    syncFromPanel.current = false;
    setIniData(data);
    setOriginalRaw(content);
    setEditorContent(content);
    setEnabled(true);
    setHighlightLine(null);
    setCurrentFileName('sample.modelfile');
    setIsModified(false);
    addToast('示例文件已加载', 'success');
    addLog({ id: generateId(), level: 'info', message: '加载示例INI文件', timestamp: Date.now(), module: 'IniConfig' });
  }, [addToast, addLog]);

  // ---- Export ----
  const handleExport = useCallback(() => {
    if (!iniData) { addToast('没有可导出的内容', 'error'); return; }
    const content = editorContent || buildIniContent(iniData);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fromName = iniData.fromConfig.replace(/^FROM\s+/i, '').replace(/[:/]/g, '_');
    a.download = (fromName || 'config') + '_' + getTimestamp() + '.ini';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('文件导出成功', 'success');
    addLog({ id: generateId(), level: 'info', message: '导出INI文件', timestamp: Date.now(), module: 'IniConfig' });
  }, [iniData, editorContent, addToast, addLog]);

  // ---- Reset ----
  const handleReset = useCallback(() => {
    if (!originalRaw) { addToast('没有原始内容可重置', 'error'); return; }
    if (!confirm('确定要重置所有修改吗？')) return;
    const data = parseIniContent(originalRaw);
    syncFromPanel.current = false;
    setIniData(data);
    setEditorContent(originalRaw);
    setHighlightLine(null);
    setIsModified(false);
    addToast('已重置为原始内容', 'success');
    addLog({ id: generateId(), level: 'info', message: '重置INI配置', timestamp: Date.now(), module: 'IniConfig' });
  }, [originalRaw, addToast, addLog]);

  // ---- Parameter change (from panel) ----
  const handleParamChange = useCallback((key: string, value: string) => {
    syncFromPanel.current = true;
    setIniData(prev => {
      if (!prev) return prev;
      return { ...prev, parameters: prev.parameters.map(p => p.key === key ? { ...p, value } : p) };
    });
  }, []);

  // ---- FROM change (from panel) ----
  const handleFromChange = useCallback((value: string) => {
    syncFromPanel.current = true;
    setIniData(prev => prev ? { ...prev, fromConfig: value } : prev);
  }, []);

  // ---- System change (from panel) ----
  const handleSystemChange = useCallback((value: string) => {
    syncFromPanel.current = true;
    setIniData(prev => prev ? { ...prev, systemContent: value } : prev);
  }, []);

  // ---- Template change (from panel) ----
  const handleTemplateChange = useCallback((value: string) => {
    syncFromPanel.current = true;
    setIniData(prev => prev ? { ...prev, templateContent: value } : prev);
  }, []);

  // ---- Copy ----
  const handleCopy = useCallback(() => {
    const content = editorContent || (iniData ? buildIniContent(iniData) : '');
    if (!content) { addToast('没有内容可复制', 'error'); return; }
    navigator.clipboard.writeText(content).then(
      () => addToast('已复制到剪贴板', 'success'),
      () => addToast('复制失败', 'error'),
    );
  }, [editorContent, iniData, addToast]);

  // ---- Manual save ----
  const handleSave = useCallback(() => {
    if (!iniData) return;
    try {
      const content = editorContent || buildIniContent(iniData);
      localStorage.setItem('ini_config_autosave', JSON.stringify({ raw: content, originalRaw, time: new Date().toISOString() }));
      addToast('手动保存成功', 'success');
      addLog({ id: generateId(), level: 'info', message: '手动保存INI配置', timestamp: Date.now(), module: 'IniConfig' });
    } catch {
      addToast('保存失败', 'error');
    }
  }, [iniData, editorContent, originalRaw, addToast, addLog]);

  // ---- Splitter ----
  const handleSplitterDrag = useCallback((dx: number) => {
    if (!containerRef.current) return;
    const pctChange = (dx / containerRef.current.offsetWidth) * 100;
    setLeftPanelWidth(prev => Math.max(30, Math.min(75, prev + pctChange)));
  }, []);

  // ---- Editor content change ----
  const handleEditorChange = useCallback((val: string) => {
    syncFromEditor.current = true;
    setEditorContent(val);
  }, []);

  // ---- Computed ----
  const lineCount = editorContent.split('\n').length;
  const charCount = editorContent.length;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden', color: 'var(--text-primary)' }}>
      <input ref={fileInputRef} type="file" accept=".ini,.txt,.modelfile,.conf" style={{ display: 'none' }} onChange={handleFileChange} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AnimatePresence>
        {helpVisible && <HelpModal visible={helpVisible} onClose={() => setHelpVisible(false)} />}
      </AnimatePresence>

      {/* ======= TOP HEADER BAR ======= */}
      <div style={{
        background: 'var(--bg-toolbar)', borderBottom: '1px solid var(--border-primary)',
        padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, gap: 8,
      }}>
        {/* Left: Logo & file info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Braces size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.2 }}>
              INI Config Editor
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {currentFileName ? (
                <>
                  <FileText size={10} />
                  <span>{currentFileName}</span>
                  {isModified && <span style={{ color: 'var(--ini-value)', fontWeight: 600 }}>● 已修改</span>}
                </>
              ) : (
                <span>未加载文件</span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ToolBtn onClick={handleUpload} variant="primary" title="上传文件">
            <Upload size={13} /> 上传
          </ToolBtn>
          <ToolBtn onClick={handleLoadSample} variant="ghost" title="加载示例">
            <Play size={13} /> 示例
          </ToolBtn>
          <div style={{ width: 1, height: 20, background: 'var(--border-primary)', margin: '0 4px' }} />
          <ToolBtn onClick={handleSave} variant="secondary" disabled={!enabled} title="保存">
            <Save size={13} /> 保存
          </ToolBtn>
          <ToolBtn onClick={handleExport} variant="success" disabled={!enabled} title="导出">
            <Download size={13} /> 导出
          </ToolBtn>
          <ToolBtn onClick={handleCopy} variant="secondary" disabled={!enabled} title="复制">
            <Copy size={13} />
          </ToolBtn>
          <ToolBtn onClick={handleReset} variant="warning" disabled={!enabled} title="重置">
            <RotateCcw size={13} />
          </ToolBtn>
        </div>

        {/* Right: Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Font size selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--bg-secondary)', borderRadius: 6, padding: '2px 4px' }}>
            {[12, 13, 14, 16].map(s => (
              <button key={s} onClick={() => setFontSize(s)} style={{
                padding: '3px 7px', borderRadius: 4, border: 'none', fontSize: 10, fontWeight: fontSize === s ? 600 : 400,
                background: fontSize === s ? 'var(--bg-accent-subtle)' : 'transparent',
                color: fontSize === s ? 'var(--text-accent)' : 'var(--text-tertiary)',
                cursor: 'pointer',
              }}>
                {s}
              </button>
            ))}
          </div>
          <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="切换主题" style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-primary)',
            background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
          }}>
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          <button onClick={() => setHelpVisible(true)} title="帮助" style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-primary)',
            background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
          }}>
            <HelpCircle size={14} />
          </button>
        </div>
      </div>

      {/* ======= MAIN CONTENT ======= */}
      <div ref={containerRef} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ---- LEFT: Code Editor ---- */}
        <div style={{
          width: leftPanelWidth + '%', minWidth: '30%', maxWidth: '75%',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Editor header */}
          <div style={{
            padding: '6px 14px', background: 'var(--bg-section-header)',
            borderBottom: '1px solid var(--border-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginLeft: 4 }}>
                {currentFileName || 'untitled.modelfile'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
              {enabled && (
                <>
                  <span>{lineCount} 行</span>
                  <span>·</span>
                  <span>{charCount} 字符</span>
                  <span>·</span>
                  <span>{iniData?.parameters.length || 0} 参数</span>
                </>
              )}
            </div>
          </div>

          {/* Editor body */}
          <div style={{ flex: 1, overflow: 'hidden', padding: 0 }}>
            {enabled ? (
              <CodeEditor
                value={editorContent}
                onChange={handleEditorChange}
                fontSize={fontSize}
                language="ini"
                placeholder="在此输入或粘贴 INI / Modelfile 内容..."
                showLineNumbers={true}
                highlightActiveLine={true}
                highlightLine={highlightLine}
                tabSize={2}
              />
            ) : (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16,
                background: 'var(--bg-editor)', color: 'var(--text-tertiary)',
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: 'var(--bg-accent-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={32} style={{ color: 'var(--primary-color)', opacity: 0.6 }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 6 }}>
                    开始编辑
                  </div>
                  <div style={{ fontSize: 13, maxWidth: 300 }}>
                    上传 INI / Modelfile 文件，或加载示例开始编辑
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <ToolBtn onClick={handleUpload} variant="primary">
                    <Upload size={14} /> 上传文件
                  </ToolBtn>
                  <ToolBtn onClick={handleLoadSample} variant="ghost">
                    <Play size={14} /> 加载示例
                  </ToolBtn>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---- SPLITTER ---- */}
        <Splitter onDrag={handleSplitterDrag} />

        {/* ---- RIGHT: Parameter Panel ---- */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: 'var(--bg-sidebar)',
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', alignItems: 'center',
            borderBottom: '1px solid var(--border-primary)',
            background: 'var(--bg-section-header)',
            flexShrink: 0,
          }}>
            <TabButton active={rightTab === 'params'} onClick={() => setRightTab('params')}
              icon={<SlidersHorizontal size={13} />} label="参数面板" />
            <TabButton active={rightTab === 'preview'} onClick={() => setRightTab('preview')}
              icon={<Eye size={13} />} label="结构预览" />
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {!enabled ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', gap: 8 }}>
                <SlidersHorizontal size={28} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: 13 }}>加载文件后显示参数</span>
              </div>
            ) : rightTab === 'params' ? (
              <div>
                {/* FROM */}
                <PanelSection title="FROM 模型配置" icon="🏷️">
                  <input type="text" value={iniData?.fromConfig ?? ''}
                    onChange={e => handleFromChange(e.target.value)}
                    placeholder="FROM llama3.2:latest"
                    style={{
                      width: '100%', padding: '8px 12px',
                      border: '1px solid var(--border-color)', borderRadius: 6,
                      fontSize: fontSize, fontFamily: 'monospace', fontWeight: 600,
                      color: 'var(--ini-from)', background: 'var(--bg-input)', outline: 'none',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  />
                </PanelSection>

                {/* SYSTEM */}
                <PanelSection title="角色设定 (SYSTEM)" icon="🤖">
                  <textarea value={iniData?.systemContent ?? ''}
                    onChange={e => handleSystemChange(e.target.value)}
                    placeholder="系统角色提示词..."
                    rows={5}
                    style={{
                      width: '100%', padding: '8px 12px',
                      border: '1px solid var(--border-color)', borderRadius: 6,
                      fontSize: fontSize - 1, fontFamily: 'monospace', lineHeight: 1.6,
                      color: 'var(--text-primary)', background: 'var(--bg-input)', outline: 'none',
                      resize: 'vertical', minHeight: 80,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  />
                </PanelSection>

                {/* Parameters */}
                <PanelSection title="模型参数" icon="🎛️" badge={iniData?.parameters.length}>
                  {iniData && iniData.parameters.length > 0 ? (
                    iniData.parameters.map(p => (
                      <ParameterControl key={p.key} param={p} onChange={handleParamChange} fontSize={fontSize - 1} />
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12, padding: 16 }}>
                      没有可调整的参数
                    </div>
                  )}
                </PanelSection>

                {/* TEMPLATE */}
                <PanelSection title="模板 (TEMPLATE)" icon="📝">
                  <textarea value={iniData?.templateContent ?? ''}
                    onChange={e => handleTemplateChange(e.target.value)}
                    placeholder="模板内容..."
                    rows={4}
                    style={{
                      width: '100%', padding: '8px 12px',
                      border: '1px solid var(--border-color)', borderRadius: 6,
                      fontSize: fontSize - 1, fontFamily: 'monospace', lineHeight: 1.6,
                      color: 'var(--text-primary)', background: 'var(--bg-input)', outline: 'none',
                      resize: 'vertical', minHeight: 60,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  />
                </PanelSection>
              </div>
            ) : (
              /* Preview tab */
              <div>
                <PanelSection title="文件结构" icon="📋">
                  {iniData ? (
                    <div style={{ fontSize: 12, fontFamily: 'monospace', lineHeight: 1.8 }}>
                      <StructItem label="FROM" value={iniData.fromConfig.replace(/^FROM\s+/i, '')} color="var(--ini-from)" />
                      <StructItem label="SYSTEM" value={iniData.systemContent ? (iniData.systemContent.length > 60 ? iniData.systemContent.substring(0, 60) + '...' : iniData.systemContent) : '(空)'} color="var(--ini-system)" />
                      {iniData.parameters.map(p => (
                        <StructItem key={p.key} label={'PARAM ' + p.key} value={p.value} color="var(--ini-key)" />
                      ))}
                      <StructItem label="TEMPLATE" value={iniData.templateContent ? (iniData.templateContent.length > 60 ? iniData.templateContent.substring(0, 60) + '...' : iniData.templateContent) : '(空)'} color="var(--ini-template)" />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12, padding: 16 }}>无数据</div>
                  )}
                </PanelSection>

                <PanelSection title="统计信息" icon="📊">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <StatCard label="行数" value={lineCount} />
                    <StatCard label="字符数" value={charCount} />
                    <StatCard label="参数数" value={iniData?.parameters.length ?? 0} />
                    <StatCard label="文件大小" value={Math.ceil(charCount / 1024) + ' KB'} />
                  </div>
                </PanelSection>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IniConfigPage;