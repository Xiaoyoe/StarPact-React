import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileText, Download, Save, RotateCcw, Copy, Info,
  Settings2, Sun, Moon, HelpCircle, AlertCircle, CheckCircle,
  ChevronDown, ChevronRight, ExternalLink, X
} from 'lucide-react';
import { useStore, generateId } from '@/store';
import { cn } from '@/utils/cn';
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

// ===================== INI PARSER =====================

export function parseIniContent(content: string): IniData {
  const lines = content.split('\n');
  let fromConfig = '';
  let systemContent = '';
  let templateContent = '';
  const parameters: IniParameter[] = [];

  let inSystem = false;
  let inTemplate = false;

  lines.forEach(line => {
    const trimmedLine = line.trim();

    // FROM config
    if (trimmedLine.toUpperCase().startsWith('FROM ')) {
      fromConfig = trimmedLine;
      return;
    }

    // SYSTEM content
    if (trimmedLine.toUpperCase().startsWith('SYSTEM ')) {
      const systemPart = trimmedLine.substring(7).trim();
      // Check if it starts with """ for multi-line content
      if (systemPart.startsWith('"""')) {
        systemContent = systemPart.substring(3).trim();
        inSystem = true;
      } else {
        systemContent = systemPart;
        inSystem = true;
      }
      return;
    }

    // TEMPLATE content
    if (trimmedLine.toUpperCase().startsWith('TEMPLATE ')) {
      const templatePart = trimmedLine.substring(9).trim();
      // Check if it starts with """ for multi-line content
      if (templatePart.startsWith('"""')) {
        templateContent = templatePart.substring(3).trim();
        inTemplate = true;
      } else {
        templateContent = templatePart;
        inTemplate = true;
      }
      return;
    }

    // Parameters - support both PARAMETER key value and key=value formats
    if (trimmedLine.toUpperCase().startsWith('PARAMETER ') && !inSystem && !inTemplate && !trimmedLine.startsWith(';')) {
      const paramContent = trimmedLine.substring(10).trim();
      const parts = paramContent.split(/\s+/);
      if (parts.length >= 2) {
        const key = parts[0];
        const value = parts.slice(1).join(' ');
        parameters.push({
          key,
          displayKey: key,
          value,
          section: 'PARAMETER',
          min: 0,
          max: 1,
          step: 0.01,
          isNumeric: !isNaN(Number(value)),
        });
      }
    } else if (trimmedLine.includes('=') && !inSystem && !inTemplate && !trimmedLine.startsWith(';')) {
      const [key, value] = trimmedLine.split('=').map(part => part.trim());
      if (key && value !== undefined) {
        parameters.push({
          key,
          displayKey: key,
          value,
          section: key.includes('.') ? key.split('.')[0] : 'PARAMETER',
          min: 0,
          max: 1,
          step: 0.01,
          isNumeric: !isNaN(Number(value)),
        });
      }
    }

    // Continue system content
    if (inSystem && trimmedLine && !trimmedLine.startsWith(';')) {
      // Check for end of multi-line content
      if (trimmedLine === '"""') {
        inSystem = false;
      } else {
        systemContent += '\n' + trimmedLine;
      }
    }

    // Continue template content
    if (inTemplate && trimmedLine && !trimmedLine.startsWith(';')) {
      // Check for end of multi-line content
      if (trimmedLine === '"""') {
        inTemplate = false;
      } else {
        templateContent += '\n' + trimmedLine;
      }
    }

    // End of sections when encountering PARAMETER or other sections
    if (inSystem && trimmedLine.toUpperCase().startsWith('PARAMETER ')) {
      inSystem = false;
    }
    if (inTemplate && (trimmedLine.toUpperCase().startsWith('PARAMETER ') || trimmedLine.toUpperCase().startsWith('SYSTEM '))) {
      inTemplate = false;
    }
  });

  return {
    fromConfig,
    originalFromConfig: fromConfig,
    systemContent,
    templateContent,
    originalTemplateContent: templateContent,
    parameters,
  };
}

export function buildIniContent(data: IniData): string {
  const parts: string[] = [];

  // FROM config
  if (data.fromConfig) {
    parts.push(data.fromConfig);
  }

  // SYSTEM content
  if (data.systemContent) {
    if (data.systemContent.includes('\n')) {
      parts.push(`SYSTEM """${data.systemContent}`);
      parts.push('"""');
    } else {
      parts.push(`SYSTEM ${data.systemContent}`);
    }
  }

  // Parameters
  if (data.parameters.length > 0) {
    parts.push('');
    data.parameters.forEach(param => {
      parts.push(`PARAMETER ${param.key} ${param.value}`);
    });
  }

  // TEMPLATE content
  if (data.templateContent) {
    parts.push('');
    if (data.templateContent.includes('\n')) {
      parts.push(`TEMPLATE """${data.templateContent}`);
      parts.push('"""');
    } else {
      parts.push(`TEMPLATE ${data.templateContent}`);
    }
  }

  return parts.join('\n');
}

export function validateFromConfig(value: string): { valid: boolean; message: string } {
  if (!value) {
    return { valid: false, message: 'FROM 配置不能为空' };
  }
  if (!value.toUpperCase().startsWith('FROM ')) {
    return { valid: false, message: 'FROM 配置必须以 FROM 开头' };
  }
  if (value.length < 6) {
    return { valid: false, message: 'FROM 配置格式不正确' };
  }
  return { valid: true, message: '' };
}

export function renderIniHtml(data: IniData): { html: string; lineCount: number } {
  const content = buildIniContent(data);
  const lines = content.split('\n');
  
  const htmlLines = lines.map(line => {
    if (line.toUpperCase().startsWith('FROM ')) {
      return `<span style="color: var(--ini-from); font-weight: 600;">${line}</span>`;
    }
    if (line.toUpperCase().startsWith('SYSTEM ')) {
      return `<span style="color: var(--ini-system); font-weight: 600;">SYSTEM</span> <span style="color: var(--text-primary);">${line.substring(7)}</span>`;
    }
    if (line.toUpperCase().startsWith('TEMPLATE ')) {
      return `<span style="color: var(--ini-template); font-weight: 600;">TEMPLATE</span> <span style="color: var(--text-primary);">${line.substring(9)}</span>`;
    }
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=').map(part => part.trim());
      return `<span style="color: var(--ini-key); font-weight: 600;">${key}</span> <span style="color: var(--text-tertiary);">=</span> <span style="color: var(--ini-value);">${value}</span>`;
    }
    if (line.startsWith('#')) {
      return `<span style="color: var(--ini-comment); font-style: italic;">${line}</span>`;
    }
    return `<span style="color: var(--text-primary);">${line}</span>`;
  });

  return {
    html: htmlLines.join('\n'),
    lineCount: lines.length,
  };
}

export function getSampleIni(): string {
  return `FROM llama3.2:latest

SYSTEM You are a helpful assistant that provides detailed and accurate information. Respond in Chinese when asked questions in Chinese.

# Model parameters
temperature=0.7
top_p=0.95
max_tokens=4096

# Template
template={{ .System }}\n\nUser: {{ .Prompt }}\n\nAssistant: {{ .Response }}`;
}

// ===================== TOAST =====================
interface ToastMsg {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}
let _toastId = 0;

function ToastContainer({ toasts, onRemove }: { toasts: ToastMsg[]; onRemove: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
      {toasts.map(t => {
        const bgKey = t.type === 'success' ? '--toast-success-bg' : t.type === 'error' ? '--toast-error-bg' : '--toast-info-bg';
        const textKey = t.type === 'success' ? '--toast-success-text' : t.type === 'error' ? '--toast-error-text' : '--toast-info-text';
        const borderKey = t.type === 'success' ? '--toast-success-border' : t.type === 'error' ? '--toast-error-border' : '--toast-info-border';
        const icon = t.type === 'success' ? <CheckCircle size={16} /> : t.type === 'error' ? <AlertCircle size={16} /> : <Info size={16} />;
        return (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            onClick={() => onRemove(t.id)}
            style={{
              pointerEvents: 'auto',
              padding: '12px 20px 12px 16px',
              borderRadius: 'var(--border-radius)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-lg)',
              background: `var(${bgKey})`,
              color: `var(${textKey})`,
              borderLeft: `4px solid var(${borderKey})`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              backdropFilter: 'blur(8px)',
              maxWidth: 360,
            }}
          >
            <span>{icon}</span>
            <span>{t.text}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ===================== MODAL =====================
function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'var(--bg-modal-overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-modal)',
          borderRadius: 'var(--border-radius-lg)',
          padding: 28,
          maxWidth: 560,
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>📖 使用帮助</h2>
          <button onClick={onClose} style={{
            background: 'var(--btn-icon-bg)', border: 'none', fontSize: 22, cursor: 'pointer',
            color: 'var(--text-tertiary)', width: 32, height: 32, borderRadius: 'var(--border-radius-full)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          <Section title="📂 文件管理">
            <li><b>上传文件</b>：点击"上传 INI"按钮选择 .ini / .txt / .modelfile 文件</li>
            <li><b>加载示例</b>：点击"加载示例"快速体验功能</li>
            <li><b>导出文件</b>：编辑完成后点击"导出 INI"保存文件</li>
            <li><b>重置修改</b>：恢复到最近一次上传的原始内容</li>
          </Section>
          <Section title="✏️ 编辑功能">
            <li><b>FROM 配置</b>：修改模型引用，支持格式验证</li>
            <li><b>角色设定</b>：编辑 SYSTEM 提示词内容</li>
            <li><b>参数调整</b>：通过滑块或输入框精确调整模型参数</li>
            <li><b>模板编辑</b>：编辑 TEMPLATE 模板内容</li>
          </Section>
          <Section title="👁️ 预览功能">
            <li>右侧实时预览 INI 文件内容</li>
            <li>语法高亮：FROM(绿)、关键字(紫)、注释(灰)</li>
            <li>行号显示，支持一键复制</li>
          </Section>
          <Section title="🎨 外观设置">
            <li><b>主题切换</b>：亮色/暗色模式切换</li>
            <li><b>字体大小</b>：12px ~ 18px 可调节</li>
            <li><b>布局比例</b>：可拖拽调节面板宽度</li>
          </Section>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 6 }}>{title}</h3>
      <ul style={{ paddingLeft: 20, listStyle: 'disc' }}>{children}</ul>
    </div>
  );
}

// ===================== SPLITTER =====================
function Splitter({ onDrag }: { onDrag: (dx: number) => void }) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastX.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - lastX.current;
      lastX.current = ev.clientX;
      onDrag(dx);
    };

    const handleMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 8,
        minWidth: 8,
        cursor: 'col-resize',
        background: hovered ? 'var(--bg-splitter-hover)' : 'var(--bg-splitter)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: 3,
        height: 40,
        borderRadius: 2,
        background: hovered ? 'var(--text-inverse)' : 'var(--text-tertiary)',
        opacity: hovered ? 0.9 : 0.4,
        transition: 'all 0.15s',
      }} />
    </div>
  );
}

// ===================== ICON BUTTON =====================
function IconBtn({
  children, onClick, title, variant = 'secondary', disabled = false, active = false, size = 'md',
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
  disabled?: boolean;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hovered, setHovered] = useState(false);
  const sizeMap = { sm: { px: 8, py: 4, fs: 11 }, md: { px: 14, py: 6, fs: 12 }, lg: { px: 18, py: 8, fs: 13 } };
  const s = sizeMap[size];
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
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: `${s.py}px ${s.px}px`,
        borderRadius: 'var(--border-radius-sm)',
        border: active ? '1.5px solid var(--border-accent)' : '1px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: s.fs,
        fontWeight: 500,
        background: disabled ? 'var(--btn-disabled-bg)' : (active ? 'var(--bg-accent-subtle)' : (hovered ? hoverMap[variant] : bgMap[variant])),
        color: disabled ? 'var(--btn-disabled-text)' : (active ? 'var(--text-accent)' : colorMap[variant]),
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        letterSpacing: 0.2,
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}

// ===================== PARAMETER SLIDER =====================
function ParameterControl({ param, onChange, fontSize, }: { param: IniParameter; onChange: (key: string, value: string) => void; fontSize: number; }) {
  const [localValue, setLocalValue] = useState(param.value);

  useEffect(() => { setLocalValue(param.value); }, [param.value]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalValue(v);
    onChange(param.key, v);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalValue(v);
    onChange(param.key, v);
  };

  const numVal = parseFloat(localValue);
  const isValidNum = !isNaN(numVal);

  // Calculate slider percentage for gradient
  const pct = isValidNum ? Math.min(100, Math.max(0, ((numVal - param.min) / (param.max - param.min)) * 100)) : 0;

  return (
    <div style={{
      padding: '16px 20px',
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--border-radius)',
      border: '1px solid var(--border-color)',
      marginBottom: 12,
      boxShadow: 'var(--shadow-md)',
      transition: 'all 0.2s ease',
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 16 
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{
            fontSize: fontSize + 1,
            fontWeight: 600,
            color: 'var(--text-heading)',
            fontFamily: "'Consolas', 'Monaco', monospace",
          }}>
            {param.displayKey}
          </span>
          <span style={{
            fontSize: fontSize - 3,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            {param.section}
          </span>
        </div>
      </div>

      {param.isNumeric ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{
              position: 'relative',
              marginBottom: 8,
            }}>
              {/* Track */}
              <div style={{
                width: '100%',
                height: 6,
                background: 'var(--bg-secondary)',
                borderRadius: 3,
              }} />
              {/* Progress */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${pct}%`,
                height: 6,
                background: 'linear-gradient(90deg, var(--primary-color), var(--primary-dark))',
                borderRadius: 3,
                transition: 'width 0.2s ease-out',
              }} />
              {/* Thumb indicator */}
              <div style={{
                position: 'absolute',
                top: -5,
                left: `${pct}%`,
                transform: 'translateX(-50%)',
                width: 16,
                height: 16,
                background: 'var(--primary-color)',
                borderRadius: '50%',
                boxShadow: '0 2px 8px rgba(22, 93, 255, 0.3)',
                transition: 'all 0.2s ease-out',
                zIndex: 1,
              }} />
              {/* Slider input */}
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={isValidNum ? numVal : param.min}
                onChange={handleSlider}
                style={{
                  position: 'absolute',
                  top: -12,
                  left: 0,
                  width: '100%',
                  height: 30,
                  opacity: 0,
                  cursor: 'pointer',
                  appearance: 'none',
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--text-tertiary)',
              fontFamily: "'Consolas', 'Monaco', monospace",
            }}>
              <span>{param.min}</span>
              <span>{param.max}</span>
            </div>
          </div>
          <div style={{ minWidth: 100 }}>
            <input
              type="text"
              value={localValue}
              onChange={handleInput}
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '1.5px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                fontSize: fontSize,
                textAlign: 'center',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontFamily: "'Consolas', 'Monaco', monospace",
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--primary-color)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22, 93, 255, 0.1)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
      ) : (
        <div style={{ width: '100%' }}>
          <input
            type="text"
            value={localValue}
            onChange={handleInput}
            style={{
            width: '100%',
            padding: '12px 16px',
            border: '1.5px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            fontSize: fontSize,
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontFamily: "'Consolas', 'Monaco', monospace",
            outline: 'none',
            transition: 'all 0.2s ease',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--primary-color)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22, 93, 255, 0.1)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          />
        </div>
      )}
    </div>
  );
}

// ===================== INI PREVIEW =====================
function IniPreview({
  data, fontSize, highlightLine,
}: {
  data: IniData | null;
  fontSize: number;
  highlightLine: number | null;
}) {
  const preRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightLine !== null && preRef.current) {
      const lineEl = preRef.current.querySelector(`[data-line="${highlightLine}"]`);
      if (lineEl) {
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightLine]);

  if (!data) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--text-tertiary)', gap: 12,
      }}>
        <span style={{ fontSize: 48, opacity: 0.3 }}>📄</span>
        <span style={{ fontSize: 14 }}>上传或加载 INI 文件以预览</span>
      </div>
    );
  }

  const { html, lineCount } = renderIniHtml(data);
  const htmlLines = html.split('\n');

  return (
    <div ref={preRef} style={{
      height: '100%', overflowY: 'auto', display: 'flex',
      background: 'var(--bg-preview)',
      fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
      fontSize: fontSize,
      lineHeight: `${Math.round(fontSize * 1.7)}px`,
    }}>
      {/* Line numbers */}
      <div style={{
        padding: '12px 0',
        background: 'var(--bg-line-number)',
        borderRight: '1px solid var(--border-primary)',
        userSelect: 'none',
        minWidth: Math.max(36, String(lineCount).length * 9 + 20),
        flexShrink: 0,
        textAlign: 'right',
      }}>
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i}
            data-line={i + 1}
            style={{
              paddingRight: 10,
              paddingLeft: 8,
              color: 'var(--text-line-number)',
              fontSize: fontSize - 1,
              height: `${Math.round(fontSize * 1.7)}px`,
              lineHeight: `${Math.round(fontSize * 1.7)}px`,
              background: highlightLine === i + 1 ? 'var(--bg-current-line)' : 'transparent',
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{
        padding: '12px 16px',
        flex: 1,
        overflowX: 'auto',
        whiteSpace: 'pre',
      }}>
        {htmlLines.map((lineHtml, i) => (
          <div
            key={i}
            data-line={i + 1}
            style={{
              height: `${Math.round(fontSize * 1.7)}px`,
              lineHeight: `${Math.round(fontSize * 1.7)}px`,
              background: highlightLine === i + 1 ? 'var(--bg-current-line)' : 'transparent',
              borderRadius: highlightLine === i + 1 ? 'var(--border-radius-xs)' : 0,
              paddingRight: 8,
            }}
            dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }}
          />
        ))}
      </div>
    </div>
  );
}

// ===================== COLLAPSIBLE SECTION =====================
function CollapsibleSection({
  title, icon, children, defaultOpen = true, badge, actions,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  actions?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--border-radius)',
      border: '1px solid var(--border-card)',
      boxShadow: 'var(--shadow-xs)',
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '10px 14px',
          background: 'var(--bg-section-header)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: open ? '1px solid var(--border-primary)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>{title}</span>
          {badge && (
            <span style={{
              fontSize: 10, padding: '1px 7px', borderRadius: 'var(--border-radius-full)',
              background: 'var(--bg-badge)', color: 'var(--text-inverse)', fontWeight: 600,
            }}>{badge}</span>
          )}
          <span style={{
            fontSize: 10, color: 'var(--text-tertiary)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}>▼</span>
        </div>
        {actions && <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>{actions}</div>}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ padding: 14, overflow: 'auto' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===================== DIVIDER =====================
function Divider() {
  return <div style={{ width: 1, height: 24, background: 'var(--border-primary)', margin: '0 4px' }} />;
}

// ===================== MAIN COMPONENT =====================
export function IniConfigPage() {
  const { addLog } = useStore();
  
  // ---- State ----
  const [iniData, setIniData] = useState<IniData | null>(null);
  const [originalRaw, setOriginalRaw] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [helpVisible, setHelpVisible] = useState(false);
  const [fromError, setFromError] = useState('');
  const [highlightLine, setHighlightLine] = useState<number | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(38); // percentage of remaining space after right panel

  // Undo stacks
  const [systemHistory, setSystemHistory] = useState<string[]>([]);
  const [fullIniContent, setFullIniContent] = useState<string>('');
  const [currentFileName, setCurrentFileName] = useState<string>('');

  // Sync fullIniContent with iniData
  useEffect(() => {
    if (iniData) {
      const content = buildIniContent(iniData);
      setFullIniContent(content);
    }
  }, [iniData]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ---- Toast ----
  const addToast = useCallback((text: string, type: ToastMsg['type'] = 'info', duration = 3000) => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ---- Theme ----
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
          setEnabled(true);
          addToast('已自动加载上次的内容', 'info');
          
          addLog({
            id: generateId(),
            level: 'info',
            message: '自动加载INI配置',
            timestamp: Date.now(),
            module: 'IniConfig',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load autosave:', error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save timer
  useEffect(() => {
    if (!iniData) return;
    const interval = setInterval(() => {
      try {
        const content = buildIniContent(iniData);
        localStorage.setItem('ini_config_autosave', JSON.stringify({ raw: content, originalRaw, time: new Date().toISOString() }));
      } catch (error) {
        console.error('Failed to autosave:', error);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [iniData, originalRaw]);

  // ---- Refresh data helper ----
  const updateIniData = useCallback((updater: (data: IniData) => IniData) => {
    setIniData(prev => {
      if (!prev) return prev;
      return updater(prev);
    });
  }, []);

  // ---- File upload ----
  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const data = parseIniContent(content);
        setIniData(data);
        setOriginalRaw(content);
        setEnabled(true);
        setFromError('');
        setHighlightLine(null);
        setSystemHistory([data.systemContent]);
        setCurrentFileName(file.name);
        addToast(`文件上传成功：${file.name}`, 'success');
        
        addLog({
          id: generateId(),
          level: 'info',
          message: `上传INI文件: ${file.name}`,
          timestamp: Date.now(),
          module: 'IniConfig',
        });
      } catch (err) {
        addToast(`文件解析失败：${err}`, 'error');
        
        addLog({
          id: generateId(),
          level: 'error',
          message: `文件解析失败: ${err}`,
          timestamp: Date.now(),
          module: 'IniConfig',
        });
      }
    };
    reader.onerror = () => {
      addToast('文件读取失败', 'error');
      
      addLog({
        id: generateId(),
        level: 'error',
        message: '文件读取失败',
        timestamp: Date.now(),
        module: 'IniConfig',
      });
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  }, [addToast]);

  // ---- Load sample ----
  const handleLoadSample = useCallback(() => {
    const content = getSampleIni();
    const data = parseIniContent(content);
    setIniData(data);
    setOriginalRaw(content);
    setEnabled(true);
    setFromError('');
    setHighlightLine(null);
    setSystemHistory([data.systemContent]);
    addToast('示例文件已加载', 'success');
    
    addLog({
      id: generateId(),
      level: 'info',
      message: '加载示例INI文件',
      timestamp: Date.now(),
      module: 'IniConfig',
    });
  }, [addToast]);

  // ---- Export ----
  const handleExport = useCallback(() => {
    if (!iniData) {
      addToast('没有可导出的内容', 'error');
      return;
    }
    const content = buildIniContent(iniData);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fromName = iniData.fromConfig.replace(/^FROM\s+/i, '').replace(/[:/]/g, '_');
    a.download = `${fromName || 'config'}_${getTimestamp()}.ini`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('文件导出成功', 'success');
    
    addLog({
      id: generateId(),
      level: 'info',
      message: `导出INI文件: ${fromName || 'config'}`,
      timestamp: Date.now(),
      module: 'IniConfig',
    });
  }, [iniData, addToast]);

  // ---- Reset ----
  const handleReset = useCallback(() => {
    if (!originalRaw) {
      addToast('没有原始内容可重置', 'error');
      return;
    }
    if (!confirm('确定要重置所有修改吗？将恢复到原始上传的内容。')) return;
    const data = parseIniContent(originalRaw);
    setIniData(data);
    setFromError('');
    setHighlightLine(null);
    addToast('已重置为原始内容', 'success');
    
    addLog({
      id: generateId(),
      level: 'info',
      message: '重置INI配置',
      timestamp: Date.now(),
      module: 'IniConfig',
    });
  }, [originalRaw, addToast]);

  // ---- FROM config ----
  const handleFromChange = useCallback((value: string) => {
    const validation = validateFromConfig(value);
    setFromError(validation.valid ? '' : validation.message);
    updateIniData(d => ({ ...d, fromConfig: value }));
  }, [updateIniData]);

  const handleFromRestore = useCallback(() => {
    if (!iniData) return;
    updateIniData(d => ({ ...d, fromConfig: d.originalFromConfig }));
    setFromError('');
    addToast('FROM 配置已恢复', 'info');
  }, [iniData, updateIniData, addToast]);

  const handleFromLocate = useCallback(() => {
    setHighlightLine(1);
    addToast('已定位到 FROM 配置', 'info');
    setTimeout(() => setHighlightLine(null), 3000);
  }, [addToast]);

  // ---- System content ----
  const handleSystemChange = useCallback((value: string) => {
    updateIniData(d => ({ ...d, systemContent: value }));
  }, [updateIniData]);

  const handleSystemReparse = useCallback(() => {
    if (!originalRaw) return;
    const fresh = parseIniContent(originalRaw);
    updateIniData(d => ({ ...d, systemContent: fresh.systemContent }));
    addToast('角色设定已重新截取', 'info');
  }, [originalRaw, updateIniData, addToast]);

  const handleSystemUndo = useCallback(() => {
    if (systemHistory.length > 1) {
      const newHistory = [...systemHistory];
      newHistory.pop();
      setSystemHistory(newHistory);
      const prev = newHistory[newHistory.length - 1];
      updateIniData(d => ({ ...d, systemContent: prev }));
      addToast('已撤销角色设定修改', 'info');
    } else {
      addToast('没有更多的撤销记录', 'info');
    }
  }, [systemHistory, updateIniData, addToast]);

  // Save system history on blur
  const handleSystemBlur = useCallback(() => {
    if (iniData) {
      setSystemHistory(prev => {
        if (prev[prev.length - 1] !== iniData.systemContent) {
          return [...prev, iniData.systemContent];
        }
        return prev;
      });
    }
  }, [iniData]);

  // ---- Parameter change ----
  const handleParamChange = useCallback((key: string, value: string) => {
    updateIniData(d => ({
      ...d,
      parameters: d.parameters.map(p => p.key === key ? { ...p, value } : p),
    }));
  }, [updateIniData]);

  // ---- Template content ----
  const handleTemplateChange = useCallback((value: string) => {
    updateIniData(d => ({ ...d, templateContent: value }));
  }, [updateIniData]);

  const handleTemplateRestore = useCallback(() => {
    if (!iniData) return;
    updateIniData(d => ({ ...d, templateContent: d.originalTemplateContent }));
    addToast('TEMPLATE 已恢复', 'info');
  }, [iniData, updateIniData, addToast]);

  // ---- Full INI content edit ----
  const handleFullIniChange = useCallback((value: string) => {
    setFullIniContent(value);
    try {
      const parsedData = parseIniContent(value);
      updateIniData(parsedData);
      setFromError('');
      setHighlightLine(null);
      setSystemHistory([parsedData.systemContent]);
    } catch (err) {
      // Parse error, but allow editing to continue
      addToast(`解析错误：${err}`, 'error');
    }
  }, [updateIniData, addToast]);

  // ---- Copy preview ----
  const handleCopyPreview = useCallback(() => {
    if (!iniData) {
      addToast('没有内容可复制', 'error');
      return;
    }
    const content = buildIniContent(iniData);
    navigator.clipboard.writeText(content).then(
      () => addToast('已复制到剪贴板', 'success'),
      () => addToast('复制失败', 'error'),
    );
  }, [iniData, addToast]);

  // ---- Manual save ----
  const handleManualSave = useCallback(() => {
    if (!iniData) return;
    try {
      const content = buildIniContent(iniData);
      localStorage.setItem('ini_config_autosave', JSON.stringify({ raw: content, originalRaw, time: new Date().toISOString() }));
      addToast('手动保存成功', 'success');
      
      addLog({
        id: generateId(),
        level: 'info',
        message: '手动保存INI配置',
        timestamp: Date.now(),
        module: 'IniConfig',
      });
    } catch (error) {
      addToast('保存失败', 'error');
      
      addLog({
        id: generateId(),
        level: 'error',
        message: `保存失败: ${error}`,
        timestamp: Date.now(),
        module: 'IniConfig',
      });
    }
  }, [iniData, originalRaw, addToast]);

  // ---- Splitter drag ----
  const handleSplitterDrag = useCallback((dx: number) => {
    if (!containerRef.current) return;
    const totalWidth = containerRef.current.offsetWidth;
    const pctChange = (dx / totalWidth) * 100;
    setLeftPanelWidth(prev => Math.max(25, Math.min(70, prev + pctChange)));
  }, []);

  // ---- Font size ----
  const fontSizes = [12, 13, 14, 16, 18];

  // ---- Compute parameter groups ----
  const parameterParams = iniData?.parameters.filter(p => p.section === 'PARAMETER') ?? [];
  const templateParams = iniData?.parameters.filter(p => p.section === 'TEMPLATE') ?? [];

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      overflow: 'hidden',
    }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ini,.txt,.modelfile,.conf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Help modal */}
      <HelpModal visible={helpVisible} onClose={() => setHelpVisible(false)} />

      {/* ======= MAIN CONTENT ======= */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* ---- LEFT PANEL: Editor ---- */}
        <div style={{
          width: `${leftPanelWidth}%`,
          minWidth: '25%',
          maxWidth: '70%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-sidebar)',
        }}>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {/* Current File Name */}
            {currentFileName && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--bg-info)',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--border-info)',
                marginBottom: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={14} style={{ color: 'var(--text-info)' }} />
                  <span style={{ fontSize: 13, color: 'var(--text-info)', fontWeight: 500 }}>
                    当前文件: {currentFileName}
                  </span>
                </div>
              </div>
            )}

            {/* FROM Config */}
            <CollapsibleSection
              title="FROM 配置"
              icon="🏷️"
              actions={
                enabled ? (
                  <>
                    <IconBtn onClick={handleFromLocate} size="sm" variant="ghost" title="在预览中定位">📍</IconBtn>
                    <IconBtn onClick={handleFromRestore} size="sm" variant="ghost" title="恢复原始值">↩️</IconBtn>
                  </>
                ) : undefined
              }
            >
              <div>
                <input
                  type="text"
                  value={iniData?.fromConfig ?? ''}
                  onChange={e => handleFromChange(e.target.value)}
                  placeholder="FROM llama3.2:latest"
                  disabled={!enabled}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1.5px solid ${fromError ? 'var(--border-error)' : 'var(--border-primary)'}`,
                    borderRadius: 'var(--border-radius-sm)',
                    fontSize: fontSize,
                    fontFamily: "'Consolas', 'Monaco', monospace",
                    fontWeight: 600,
                    color: 'var(--ini-from)',
                    background: 'var(--bg-input)',
                    outline: 'none',
                    opacity: enabled ? 1 : 0.5,
                  }}
                  onFocus={e => { if (!fromError) e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
                  onBlur={e => { if (!fromError) e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                />
                {fromError && (
                  <div style={{
                    marginTop: 6, fontSize: 11, color: 'var(--diff-different-text)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span>⚠️</span> {fromError}
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* System / Role */}
            <CollapsibleSection
              title="角色设定 (SYSTEM)"
              icon="🤖"
              actions={
                enabled ? (
                  <>
                    <IconBtn onClick={handleSystemUndo} size="sm" variant="ghost" title="撤销">↩️</IconBtn>
                    <IconBtn onClick={handleSystemReparse} size="sm" variant="ghost" title="重新截取">🔄</IconBtn>
                  </>
                ) : undefined
              }
            >
              <div style={{ height: 200, border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius)', overflow: 'auto', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>系统角色设定编辑区</span>
              </div>
            </CollapsibleSection>

            {/* Parameters */}
            <CollapsibleSection
              title="参数调整"
              icon="🎛️"
              badge={iniData ? String(iniData.parameters.length) : undefined}
            >
              {!enabled ? (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, padding: 16 }}>
                  请先上传或加载 INI 文件
                </div>
              ) : iniData && iniData.parameters.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, padding: 16 }}>
                  没有可调整的参数
                </div>
              ) : (
                <>
                  {parameterParams.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
                        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
                      }}>PARAMETER</div>
                      {parameterParams.map(p => (
                        <ParameterControl key={p.key} param={p} onChange={handleParamChange} fontSize={fontSize} />
                      ))}
                    </div>
                  )}
                  {templateParams.length > 0 && (
                    <div>
                      <div style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
                        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
                      }}>TEMPLATE PARAMS</div>
                      {templateParams.map(p => (
                        <ParameterControl key={p.key} param={p} onChange={handleParamChange} fontSize={fontSize} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </CollapsibleSection>

            {/* Template / CONTENT */}
            <CollapsibleSection
              title="模板内容 (TEMPLATE)"
              icon="📝"
              actions={
                enabled ? (
                  <IconBtn onClick={handleTemplateRestore} size="sm" variant="ghost" title="恢复原始值">↩️</IconBtn>
                ) : undefined
              }
            >
              <div style={{ height: 150, border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius)', overflow: 'auto', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>模板内容编辑区</span>
              </div>
            </CollapsibleSection>
          </div>
        </div>

        {/* ---- SPLITTER ---- */}
        <Splitter onDrag={handleSplitterDrag} />

        {/* ---- RIGHT PANEL: Full INI Editor ---- */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: 14, borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-section-header)' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>完整 INI 文件编辑</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>编辑完整的 INI 文件内容，支持实时解析</p>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>完整 INI 文件编辑区</span>
          </div>
        </div>
      </div>

      {/* ======= TOOLBAR (BOTTOM) ======= */}
      <div style={{
        background: 'var(--bg-toolbar)',
        borderTop: '1px solid var(--border-primary)',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
        flexWrap: 'wrap',
        flexShrink: 0,
        boxShadow: 'var(--shadow-xs)',
      }}>
        {/* Status */}
        {iniData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-tertiary)', marginRight: 'auto' }}>
            <span>参数: {iniData.parameters.length}</span>
            <span>行数: {buildIniContent(iniData).split('\n').length}</span>
          </div>
        )}

        {/* Font size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginRight: 2 }}>字体：</span>
          {fontSizes.map(s => (
            <button
              key={s}
              onClick={() => setFontSize(s)}
              style={{
                padding: '3px 8px',
                borderRadius: 'var(--border-radius-xs)',
                border: fontSize === s ? '1.5px solid var(--border-accent)' : '1px solid var(--border-primary)',
                background: fontSize === s ? 'var(--bg-accent-subtle)' : 'var(--bg-secondary)',
                color: fontSize === s ? 'var(--text-accent)' : 'var(--text-secondary)',
                fontSize: 11,
                fontWeight: fontSize === s ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <Divider />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconBtn onClick={handleCopyPreview} variant="secondary" disabled={!enabled} title="复制全部内容">
            <Copy size={14} />
            复制
          </IconBtn>
        </div>

        <Divider />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconBtn onClick={handleExport} variant="success" disabled={!enabled} title="导出INI文件">
            <Download size={14} />
            导出 INI
          </IconBtn>
          <IconBtn onClick={handleManualSave} variant="secondary" disabled={!enabled} title="手动保存">
            <Save size={14} />
            保存
          </IconBtn>
          <IconBtn onClick={handleReset} variant="warning" disabled={!enabled} title="重置修改">
            <RotateCcw size={14} />
            重置
          </IconBtn>
        </div>

        <Divider />

        {/* File operations */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconBtn onClick={handleUpload} variant="primary" title="上传INI文件">
            <Upload size={14} />
            上传 INI
          </IconBtn>
          <IconBtn onClick={handleLoadSample} variant="ghost" title="加载示例文件">
            <FileText size={14} />
            加载示例
          </IconBtn>
        </div>
      </div>
    </div>
  );
}
