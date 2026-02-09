import React, { useRef, useCallback, useEffect, useMemo } from 'react';

// 仅保留核心属性：内容、变更回调、占位符、字体大小、是否显示行号、只读
interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fontSize?: number;
  showLineNumbers?: boolean;
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  placeholder = '',
  fontSize = 13,
  showLineNumbers = true,
  readOnly = false,
}: CodeEditorProps) {
  // 核心Ref：绑定textarea和行号容器
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  // 计算行高（字体大小*1.6 保证排版舒适）
  const lineHeight = fontSize * 1.6;
  // 分割文本为行，计算总行数（至少1行）
  const lines = value.split('\n');
  const lineCount = lines.length || 1;

  // 计算行号区域宽度：根据行数的位数自动适配，最小40px
  const lineNumWidth = useMemo(() => {
    const digits = Math.max(1, Math.floor(Math.log10(Math.max(1, lineCount))) + 1);
    return Math.max(40, 16 + fontSize * 0.62 * digits);
  }, [lineCount, fontSize]);

  // 共享文本样式（保证行号和编辑区行高/字体一致）
  const sharedTextStyle = useMemo<React.CSSProperties>(() => ({
    fontSize,
    lineHeight: `${lineHeight}px`,
    fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    padding: 8,
    margin: 0,
    border: 'none',
    boxSizing: 'border-box' as const,
    tabSize: 4,
  }), [fontSize, lineHeight]);

  // 核心：同步滚动 - textarea滚动时，行号容器同步滚动
  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta || !lineRef.current) return;
    lineRef.current.scrollTop = ta.scrollTop; // 同步垂直滚动
  }, []);

  // 内容变化时重新同步滚动（避免内容高度变化导致行号错位）
  useEffect(() => {
    handleScroll();
  }, [value, handleScroll]);

  // 基础文本变更处理
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  // 生成行号节点（每行对应一个行号，高度和编辑区行高一致）
  const lineNumbers = useMemo(() => {
    const nums: React.ReactNode[] = [];
    for (let i = 0; i < lineCount; i++) {
      nums.push(
        <div
          key={i}
          style={{
            height: lineHeight,
            lineHeight: `${lineHeight}px`,
            fontSize,
            textAlign: 'right',
            paddingRight: 10,
            paddingLeft: 6,
            color: '#999', // 行号默认灰色，可自定义
            userSelect: 'none', // 禁止选中行号
          }}
        >
          {i + 1}
        </div>,
      );
    }
    return nums;
  }, [lineCount, lineHeight, fontSize]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--bg-input)',
        borderRadius: 'var(--border-radius-sm)',
        border: 'none',
      }}
    >
      {/* 编辑器主体：行号 + 编辑区 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* 行号区域（可选） */}
        {showLineNumbers && (
          <div
            ref={lineRef}
            aria-hidden="true"
            style={{
              width: lineNumWidth,
              minWidth: lineNumWidth,
              flexShrink: 0,
              background: 'var(--bg-line-number)',
              borderRight: '1px solid var(--border-primary)',
              overflowY: 'hidden', // 滚动由textarea驱动
              overflowX: 'hidden',
              paddingTop: 8, // 和textarea的padding-top一致
              boxSizing: 'border-box',
            }}
          >
            {/* 行号容器：高度和编辑区内容一致，保证滚动对齐 */}
            <div style={{ minHeight: lineCount * lineHeight }}>
              {lineNumbers}
            </div>
          </div>
        )}

        {/* 核心编辑区：textarea */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onScroll={handleScroll} // 滚动时触发行号同步
            placeholder={placeholder}
            spellCheck={false} // 关闭拼写检查（代码编辑不需要）
            readOnly={readOnly}
            style={{
              ...sharedTextStyle,
              width: '100%',
              height: '100%',
              resize: 'none', // 禁止手动调整大小
              outline: 'none', // 去掉默认聚焦边框
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              caretColor: 'var(--text-primary)',
              overflow: 'auto',
              opacity: readOnly ? 0.5 : 1,
            }}
          />
        </div>
      </div>
    </div>
  );
}
