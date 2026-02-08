import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';

interface NovelEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fontSize?: number;
  label?: string;
  diffs?: Array<{ text: string; type: 'same' | 'different' }> | null;
  showLineNumbers?: boolean;
  readOnly?: boolean;
}

export function NovelEditor({
  value,
  onChange,
  placeholder = '',
  fontSize = 13,
  label = '',
  diffs = null,
  showLineNumbers = true,
  readOnly = false,
}: NovelEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const showHighlight = diffs !== null && diffs.length > 0;
  const lineHeight = fontSize * 1.6;
  const padding = 10;

  const lines = useMemo(() => value.split('\n'), [value]);
  const lineCount = lines.length;

  const gutterWidth = useMemo(() => {
    const digits = Math.max(1, Math.floor(Math.log10(Math.max(1, lineCount))) + 1);
    return Math.max(44, 18 + fontSize * 0.62 * digits);
  }, [lineCount, fontSize]);

  const [lineHeights, setLineHeights] = useState<number[]>([]);

  const sharedFontStyle = useMemo<React.CSSProperties>(() => ({
    fontSize,
    lineHeight: `${lineHeight}px`,
    fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
    tabSize: 4,
    letterSpacing: 'normal',
  }), [fontSize, lineHeight]);

  const measureLines = useCallback(() => {
    const measureEl = measureRef.current;
    const ta = textareaRef.current;
    if (!measureEl || !ta) return;

    const taStyle = window.getComputedStyle(ta);
    const contentWidth = ta.clientWidth
      - parseFloat(taStyle.paddingLeft)
      - parseFloat(taStyle.paddingRight);

    measureEl.style.width = `${contentWidth}px`;

    const heights: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i] || '\u00A0';
      measureEl.textContent = text;
      heights.push(measureEl.offsetHeight);
    }

    setLineHeights(prev => {
      if (prev.length === heights.length && prev.every((h, idx) => h === heights[idx])) {
        return prev;
      }
      return heights;
    });
  }, [lines]);

  useEffect(() => {
    measureLines();

    const ro = new ResizeObserver(() => {
      measureLines();
    });
    if (textareaRef.current) {
      ro.observe(textareaRef.current);
    }
    return () => ro.disconnect();
  }, [measureLines]);

  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (gutterRef.current) {
      gutterRef.current.scrollTop = ta.scrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = ta.scrollTop;
      highlightRef.current.scrollLeft = ta.scrollLeft;
    }
  }, []);

  useEffect(() => {
    handleScroll();
  }, [value, handleScroll]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const plainText = e.clipboardData.getData('text/plain');
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = value.substring(0, start) + plainText + value.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        const newPos = start + plainText.length;
        ta.selectionStart = newPos;
        ta.selectionEnd = newPos;
      });
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          ta.selectionStart = start + 2;
          ta.selectionEnd = start + 2;
        });
      }
    },
    [value, onChange],
  );

  const gutterElements = useMemo(() => {
    return lines.map((_, i) => {
      const h = lineHeights[i] || lineHeight;
      return (
        <div
          key={i}
          style={{
            height: h,
            lineHeight: `${lineHeight}px`,
            fontSize,
            textAlign: 'right',
            paddingRight: 10,
            paddingLeft: 6,
            color: 'var(--text-line-number)',
            userSelect: 'none',
            boxSizing: 'border-box',
          }}
        >
          {i + 1}
        </div>
      );
    });
  }, [lines, lineHeights, lineHeight, fontSize]);

  const totalGutterHeight = useMemo(() => {
    if (lineHeights.length === 0) return lineCount * lineHeight;
    return lineHeights.reduce((sum, h) => sum + h, 0);
  }, [lineHeights, lineCount, lineHeight]);

  const highlightNodes = useMemo(() => {
    if (!diffs || diffs.length === 0) return null;
    return diffs.map((d, i) => (
      <span
        key={i}
        style={{
          color: d.type === 'same' ? 'var(--diff-same-text)' : 'var(--diff-different-text)',
        }}
      >
        {d.text}
      </span>
    ));
  }, [diffs]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--bg-editor)',
        borderRadius: 8,
        border: '1px solid var(--border-primary)',
      }}
    >
      {label && (
        <div
          style={{
            padding: '6px 12px',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 600,
            borderBottom: '1px solid var(--border-primary)',
            letterSpacing: 0.5,
            flexShrink: 0,
          }}
        >
          {label}
        </div>
      )}

      <div
        ref={measureRef}
        aria-hidden="true"
        style={{
          ...sharedFontStyle,
          position: 'absolute',
          top: -9999,
          left: -9999,
          visibility: 'hidden',
          padding: 0,
          margin: 0,
          border: 'none',
        }}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {showLineNumbers && (
          <div
            ref={gutterRef}
            aria-hidden="true"
            style={{
              width: gutterWidth,
              minWidth: gutterWidth,
              flexShrink: 0,
              background: 'var(--bg-line-number)',
              borderRight: '1px solid var(--border-primary)',
              overflowY: 'hidden',
              overflowX: 'hidden',
              paddingTop: padding,
              paddingBottom: padding,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ minHeight: totalGutterHeight }}>
              {gutterElements}
            </div>
          </div>
        )}

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {showHighlight && (
            <div
              ref={highlightRef}
              aria-hidden="true"
              style={{
                ...sharedFontStyle,
                padding,
                margin: 0,
                border: 'none',
                boxSizing: 'border-box',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                background: 'var(--bg-editor)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              {highlightNodes}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onScroll={handleScroll}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            spellCheck={false}
            readOnly={readOnly}
            style={{
              ...sharedFontStyle,
              padding,
              margin: 0,
              border: 'none',
              boxSizing: 'border-box',
              width: '100%',
              height: '100%',
              resize: 'none',
              outline: 'none',
              background: showHighlight ? 'transparent' : 'var(--bg-editor)',
              color: showHighlight ? 'transparent' : 'var(--text-primary)',
              caretColor: 'var(--text-primary)',
              position: 'relative',
              zIndex: 2,
              overflow: 'auto',
            }}
          />
        </div>
      </div>
    </div>
  );
}
