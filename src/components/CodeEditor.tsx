import React, { useState, useRef, useEffect, useCallback, useMemo, useReducer } from 'react';

// ===================== TYPES =====================
export interface CodeEditorProps {
  /** The text content of the editor */
  value: string;
  /** Callback when text changes */
  onChange?: (value: string) => void;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Font size in px */
  fontSize?: number;
  /** Language for syntax highlighting */
  language?: 'ini' | 'plain';
  /** Placeholder text when empty */
  placeholder?: string;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Whether to highlight the active line */
  highlightActiveLine?: boolean;
  /** Line number to highlight (1-based) */
  highlightLine?: number | null;
  /** Whether to show minimap indicator */
  showMinimap?: boolean;
  /** Tab size (number of spaces) */
  tabSize?: number;
  /** Whether to wrap long lines */
  wordWrap?: boolean;
  /** Max height (CSS value), default 100% */
  maxHeight?: string;
  /** Min height (CSS value) */
  minHeight?: string;
  /** Custom class */
  className?: string;
  /** On focus */
  onFocus?: () => void;
  /** On blur */
  onBlur?: () => void;
  /** On cursor position change */
  onCursorChange?: (line: number, col: number) => void;
  /** On scroll */
  onScroll?: (scrollTop: number) => void;
}

// ===================== SYNTAX HIGHLIGHTING =====================
interface Token {
  text: string;
  type: 'keyword' | 'from' | 'system' | 'template' | 'parameter' | 'key' | 'value' | 'comment' | 'string' | 'number' | 'operator' | 'punctuation' | 'plain' | 'section';
}

function tokenizeIniLine(line: string): Token[] {
  const trimmed = line.trim();
  const tokens: Token[] = [];

  // Empty line
  if (!trimmed) {
    tokens.push({ text: line, type: 'plain' });
    return tokens;
  }

  // Comments
  if (trimmed.startsWith('#') || trimmed.startsWith(';')) {
    tokens.push({ text: line, type: 'comment' });
    return tokens;
  }

  // Multi-line delimiter
  if (trimmed === '"""') {
    tokens.push({ text: line, type: 'string' });
    return tokens;
  }

  // FROM directive
  if (trimmed.toUpperCase().startsWith('FROM ')) {
    const idx = line.toUpperCase().indexOf('FROM ');
    tokens.push({ text: line.substring(0, idx), type: 'plain' });
    tokens.push({ text: 'FROM', type: 'from' });
    tokens.push({ text: ' ', type: 'plain' });
    const rest = line.substring(idx + 5);
    tokens.push({ text: rest, type: 'string' });
    return tokens;
  }

  // SYSTEM directive
  if (trimmed.toUpperCase().startsWith('SYSTEM ')) {
    const idx = line.toUpperCase().indexOf('SYSTEM ');
    tokens.push({ text: line.substring(0, idx), type: 'plain' });
    tokens.push({ text: 'SYSTEM', type: 'system' });
    tokens.push({ text: ' ', type: 'plain' });
    const rest = line.substring(idx + 7);
    if (rest.startsWith('"""')) {
      tokens.push({ text: '"""', type: 'punctuation' });
      tokens.push({ text: rest.substring(3), type: 'string' });
    } else {
      tokens.push({ text: rest, type: 'string' });
    }
    return tokens;
  }

  // TEMPLATE directive
  if (trimmed.toUpperCase().startsWith('TEMPLATE ')) {
    const idx = line.toUpperCase().indexOf('TEMPLATE ');
    tokens.push({ text: line.substring(0, idx), type: 'plain' });
    tokens.push({ text: 'TEMPLATE', type: 'template' });
    tokens.push({ text: ' ', type: 'plain' });
    const rest = line.substring(idx + 9);
    if (rest.startsWith('"""')) {
      tokens.push({ text: '"""', type: 'punctuation' });
      tokens.push({ text: rest.substring(3), type: 'string' });
    } else {
      tokens.push({ text: rest, type: 'string' });
    }
    return tokens;
  }

  // PARAMETER directive
  if (trimmed.toUpperCase().startsWith('PARAMETER ')) {
    const idx = line.toUpperCase().indexOf('PARAMETER ');
    tokens.push({ text: line.substring(0, idx), type: 'plain' });
    tokens.push({ text: 'PARAMETER', type: 'parameter' });
    const rest = line.substring(idx + 9);
    const parts = rest.trim().split(/(\s+)/);
    if (parts.length >= 1) {
      tokens.push({ text: ' ', type: 'plain' });
      tokens.push({ text: parts[0], type: 'key' });
      if (parts.length > 1) {
        tokens.push({ text: parts[1], type: 'plain' });
        const valStr = parts.slice(2).join('');
        if (!isNaN(Number(valStr)) && valStr.length > 0) {
          tokens.push({ text: valStr, type: 'number' });
        } else {
          tokens.push({ text: valStr, type: 'value' });
        }
      }
    }
    return tokens;
  }

  // Section header [Section]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    tokens.push({ text: line, type: 'section' });
    return tokens;
  }

  // Key=Value pairs
  if (trimmed.includes('=')) {
    const eqIndex = line.indexOf('=');
    const key = line.substring(0, eqIndex);
    const eq = '=';
    const val = line.substring(eqIndex + 1);
    tokens.push({ text: key, type: 'key' });
    tokens.push({ text: eq, type: 'operator' });
    const trimVal = val.trim();
    if (!isNaN(Number(trimVal)) && trimVal.length > 0) {
      tokens.push({ text: val, type: 'number' });
    } else {
      tokens.push({ text: val, type: 'value' });
    }
    return tokens;
  }

  // Plain text (could be multiline system/template content)
  tokens.push({ text: line, type: 'string' });
  return tokens;
}

// 增加CSS变量默认值兜底
function getTokenColor(type: Token['type']): string {
  const colorMap: Record<string, string> = {
    keyword: 'var(--ini-keyword, #c678dd)',
    from: 'var(--ini-from, #61afef)',
    system: 'var(--ini-system, #e5c07b)',
    template: 'var(--ini-template, #98c379)',
    parameter: 'var(--ini-keyword, #c678dd)',
    key: 'var(--ini-key, #dcdcaa)',
    value: 'var(--ini-value, #abb2bf)',
    comment: 'var(--ini-comment, #6a9955)',
    string: 'var(--ini-string, #ce9178)',
    number: 'var(--ini-number, #b5cea8)',
    operator: 'var(--text-tertiary, #828997)',
    punctuation: 'var(--text-tertiary, #828997)',
    plain: 'var(--text-editor, #e0e0e0)',
    section: 'var(--ini-keyword, #c678dd)',
  };
  return colorMap[type] || 'var(--text-editor, #e0e0e0)';
}

function getTokenFontWeight(type: Token['type']): number {
  const boldTypes = ['from', 'system', 'template', 'parameter', 'keyword', 'section'];
  return boldTypes.includes(type) ? 700 : 400;
}

// ===================== HIGHLIGHTED CONTENT =====================
function HighlightedContent({
  content,
  language,
  fontSize,
  lineHeight,
}: {
  content: string;
  language: 'ini' | 'plain';
  fontSize: number;
  lineHeight: number;
}) {
  const lines = content.split('\n');

  return (
    <div
      aria-hidden="true"
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
        fontSize,
        lineHeight: `${lineHeight}px`,
        whiteSpace: 'pre',
        wordWrap: 'normal',
        overflowWrap: 'normal',
        width: '100%',
      }}
    >
      {lines.map((line, i) => {
        const tokens = language === 'ini' ? tokenizeIniLine(line) : [{ text: line, type: 'plain' as const }];
        return (
          <div key={i} style={{ height: lineHeight, display: 'flex', alignItems: 'center' }}>
            {tokens.map((token, j) => (
              <span
                key={j}
                style={{
                  color: getTokenColor(token.type),
                  fontWeight: getTokenFontWeight(token.type),
                  fontStyle: token.type === 'comment' ? 'italic' : 'normal',
                  whiteSpace: 'pre', // 确保空格/制表符正常显示
                }}
              >
                {token.text}
              </span>
            ))}
            {/* 修复空行显示问题：用零宽空格代替&nbsp; */}
            {line === '' && <span style={{ visibility: 'hidden' }}>&#8203;</span>}
          </div>
        );
      })}
    </div>
  );
}

// ===================== LINE NUMBERS COMPONENT =====================
// 独立的行号组件，职责单一
function LineNumbers({
  lineCount,
  lineHeight,
  fontSize,
  cursorLine,
  highlightLine,
  isFocused,
  highlightActiveLine,
  scrollTop,
}: {
  lineCount: number;
  lineHeight: number;
  fontSize: number;
  cursorLine: number;
  highlightLine: number | null;
  isFocused: boolean;
  highlightActiveLine: boolean;
  scrollTop: number;
}) {
  // 计算行号区宽度：基于最大行号的位数 + 固定内边距
  const lineNumberWidth = useMemo(() => {
    const maxDigits = String(lineCount).length;
    // 每个数字约10px + 左右内边距(8+12)
    return Math.max(40, maxDigits * 10 + 20);
  }, [lineCount]);

  // 缓存行号数组
  const lineNumbers = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]);

  return (
    <div
      style={{
        width: lineNumberWidth,
        minWidth: lineNumberWidth,
        flexShrink: 0,
        background: 'var(--bg-editor-gutter, #252526)',
        borderRight: '1px solid var(--border-color, #3c3c3c)',
        overflow: 'hidden',
        userSelect: 'none',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div
        style={{
          padding: '10px 0',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: '10px',
            transform: `translateY(${-scrollTop}px)`,
            willChange: 'transform',
          }}
        >
          {lineNumbers.map((lineNum) => {
            return (
              <div
                key={lineNum}
                style={{
                  height: lineHeight,
                  lineHeight: `${lineHeight}px`,
                  fontSize: fontSize - 1,
                  textAlign: 'right',
                  padding: '0 12px 0 8px',
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace",
                  color: 'var(--text-editor-line-number, #828997)',
                  background: 'transparent',
                  fontWeight: 400,
                  boxSizing: 'border-box',
                }}
              >
                {lineNum}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===================== UNDO/REDO HISTORY =====================
interface HistoryState {
  history: string[];
  index: number;
  isAtCurrent: boolean;
}

type HistoryAction =
  | { type: 'ADD'; value: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; value: string };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'ADD':
      if (state.history[state.index] === action.value) {
        return state;
      }
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push(action.value);
      // 限制历史记录长度
      if (newHistory.length > 50) {
        newHistory.shift();
        return { history: newHistory, index: newHistory.length - 1, isAtCurrent: true };
      }
      return { history: newHistory, index: newHistory.length - 1, isAtCurrent: true };
    
    case 'UNDO':
      if (state.index > 0) {
        return { ...state, index: state.index - 1, isAtCurrent: false };
      }
      return state;
    
    case 'REDO':
      if (state.index < state.history.length - 1) {
        return { ...state, index: state.index + 1, isAtCurrent: false };
      }
      return state;
    
    case 'RESET':
      return { history: [action.value], index: 0, isAtCurrent: true };
    
    default:
      return state;
  }
}

// ===================== CODE EDITOR COMPONENT =====================
export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  fontSize = 13,
  language = 'ini',
  placeholder = '',
  showLineNumbers = true,
  highlightActiveLine = true,
  highlightLine = null,
  tabSize = 2,
  wordWrap = false,
  maxHeight,
  minHeight = '200px',
  className = '',
  onFocus,
  onBlur,
  onCursorChange,
  onScroll,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const codeAreaRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // 撤回功能状态管理
  const [historyState, dispatchHistory] = useReducer(historyReducer, {
    history: [value],
    index: 0,
    isAtCurrent: true,
  });
  
  // 同步历史记录与外部value变化
  useEffect(() => {
    if (value !== historyState.history[historyState.index] && historyState.isAtCurrent) {
      dispatchHistory({ type: 'RESET', value });
    }
  }, [value, historyState]);

  // 统一行高计算
  const lineHeight = useMemo(() => Math.round(fontSize * 1.65), [fontSize]);
  const lines = useMemo(() => value.split('\n'), [value]);
  const lineCount = lines.length;

  // 防抖处理光标更新
  const debouncedUpdateCursor = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const ta = textareaRef.current;
          if (!ta) return;
          const pos = ta.selectionStart;
          const textBefore = value.substring(0, pos);
          const linesBefore = textBefore.split('\n');
          const line = linesBefore.length;
          const col = linesBefore[linesBefore.length - 1].length + 1;
          setCursorLine(line);
          setCursorCol(col);
          onCursorChange?.(line, col);
        }, 10);
      };
    })(),
    [value, onCursorChange]
  );

  // 滚动处理：简化滚动同步，只更新状态
  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    
    const st = ta.scrollTop;
    const sl = ta.scrollLeft;
    
    // 仅在值变化时更新状态，减少重渲染
    if (st !== scrollTop) setScrollTop(st);
    if (sl !== scrollLeft) setScrollLeft(sl);
    
    // 同步高亮层滚动
    if (highlightRef.current) {
      highlightRef.current.scrollTop = st;
      highlightRef.current.scrollLeft = sl;
    }
    
    onScroll?.(st);
  }, [scrollTop, scrollLeft, onScroll]);

  // 监听光标变化
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    
    const handleSelectionChange = () => {
      if (document.activeElement === ta) {
        debouncedUpdateCursor();
      }
    };
    
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [debouncedUpdateCursor]);

  // 高亮行自动滚动
  useEffect(() => {
    if (highlightLine !== null && highlightLine > 0 && textareaRef.current && containerRef.current) {
      const ta = textareaRef.current;
      const container = containerRef.current;
      const targetY = (highlightLine - 1) * lineHeight;
      const containerHeight = container.clientHeight;
      
      const targetScroll = targetY - (containerHeight / 2) + (lineHeight / 2);
      ta.scrollTop = Math.max(0, Math.min(targetScroll, ta.scrollHeight - containerHeight));
    }
  }, [highlightLine, lineHeight]);

  // 文本变化处理
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    const newValue = e.target.value;
    onChange?.(newValue);
    dispatchHistory({ type: 'ADD', value: newValue });
  }, [readOnly, onChange]);

  // 键盘事件处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;

    // 撤回功能: Ctrl+Z / Cmd+Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      dispatchHistory({ type: 'UNDO' });
      const ta = textareaRef.current;
      if (ta) {
        const previousValue = historyState.history[historyState.index - 1];
        if (previousValue) {
          onChange?.(previousValue);
          // 保存当前光标位置
          const currentPos = ta.selectionStart;
          requestAnimationFrame(() => {
            // 尝试保持光标在相同位置附近
            ta.selectionStart = ta.selectionEnd = Math.min(currentPos, previousValue.length);
          });
        }
      }
    }

    // 重做功能: Ctrl+Y / Cmd+Y
    if (((e.ctrlKey || e.metaKey) && e.key === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
      e.preventDefault();
      dispatchHistory({ type: 'REDO' });
      const ta = textareaRef.current;
      if (ta) {
        const nextValue = historyState.history[historyState.index + 1];
        if (nextValue) {
          onChange?.(nextValue);
          // 保存当前光标位置
          const currentPos = ta.selectionStart;
          requestAnimationFrame(() => {
            // 尝试保持光标在相同位置附近
            ta.selectionStart = ta.selectionEnd = Math.min(currentPos, nextValue.length);
          });
        }
      }
    }

    // Tab 键处理
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const spaces = ' '.repeat(tabSize);

      if (e.shiftKey) {
        // 取消缩进
        const beforeStart = value.substring(0, start);
        const lineStart = beforeStart.lastIndexOf('\n') + 1;
        const selectedText = value.substring(lineStart, end);
        const newText = selectedText.split('\n').map(line => {
          if (line.startsWith(spaces)) return line.substring(tabSize);
          if (line.startsWith('\t')) return line.substring(1);
          return line.replace(/^ +/, m => m.substring(0, Math.max(0, m.length - tabSize)));
        }).join('\n');
        
        const diff = selectedText.length - newText.length;
        const newValue = value.substring(0, lineStart) + newText + value.substring(end);
        onChange?.(newValue);
        dispatchHistory({ type: 'ADD', value: newValue });
        
        requestAnimationFrame(() => {
          ta.selectionStart = Math.max(lineStart, start - (start - lineStart > tabSize ? tabSize : start - lineStart));
          ta.selectionEnd = end - diff;
        });
      } else if (start !== end) {
        // 缩进选中行
        const beforeStart = value.substring(0, start);
        const lineStart = beforeStart.lastIndexOf('\n') + 1;
        const selectedText = value.substring(lineStart, end);
        const newText = selectedText.split('\n').map(line => spaces + line).join('\n');
        const diff = newText.length - selectedText.length;
        const newValue = value.substring(0, lineStart) + newText + value.substring(end);
        
        onChange?.(newValue);
        dispatchHistory({ type: 'ADD', value: newValue });
        requestAnimationFrame(() => {
          ta.selectionStart = start + (start > lineStart ? tabSize : start - lineStart + tabSize);
          ta.selectionEnd = end + diff;
        });
      } else {
        // 光标处插入空格
        const newValue = value.substring(0, start) + spaces + value.substring(end);
        onChange?.(newValue);
        dispatchHistory({ type: 'ADD', value: newValue });
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + tabSize;
        });
      }
    }

    // Enter 键处理
    if (e.key === 'Enter') {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const beforeCursor = value.substring(0, start);
      const currentLineStart = beforeCursor.lastIndexOf('\n') + 1;
      const currentLine = beforeCursor.substring(currentLineStart);
      const indent = currentLine.match(/^(\s*)/)?.[1] || '';

      if (indent || start > 0) {
        e.preventDefault();
        const newValue = value.substring(0, start) + '\n' + indent + value.substring(ta.selectionEnd);
        onChange?.(newValue);
        dispatchHistory({ type: 'ADD', value: newValue });
        requestAnimationFrame(() => {
          const newPos = start + 1 + indent.length;
          ta.selectionStart = ta.selectionEnd = newPos;
        });
      }
    }

    // Ctrl+D / Cmd+D 复制行
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const pos = ta.selectionStart;
      const beforePos = value.substring(0, pos);
      const lineStart = beforePos.lastIndexOf('\n') + 1;
      const afterPos = value.substring(pos);
      const lineEndOffset = afterPos.indexOf('\n');
      const lineEnd = lineEndOffset === -1 ? value.length : pos + lineEndOffset;
      const currentLine = value.substring(lineStart, lineEnd);
      const newValue = value.substring(0, lineEnd) + '\n' + currentLine + value.substring(lineEnd);
      
      onChange?.(newValue);
      dispatchHistory({ type: 'ADD', value: newValue });
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = pos + currentLine.length + 1;
      });
    }
  }, [readOnly, value, onChange, tabSize, historyState]);

  // 焦点处理
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
    debouncedUpdateCursor();
  }, [onFocus, debouncedUpdateCursor]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight,
        maxHeight: maxHeight || '100%',
        background: 'var(--bg-editor, #1e1e1e)',
        borderRadius: 'var(--border-radius, 6px)',
        border: `1.5px solid ${isFocused ? 'var(--border-focus, #61afef)' : 'var(--border-color, #3c3c3c)'}`,
        overflow: 'hidden',
        transition: 'border-color 0.2s ease',
        position: 'relative',
      }}
    >
      {/* Editor body */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* 行号组件 - 独立封装，可复用 */}
        {showLineNumbers && (
          <LineNumbers
            lineCount={lineCount}
            lineHeight={lineHeight}
            fontSize={fontSize}
            cursorLine={cursorLine}
            highlightLine={highlightLine}
            isFocused={isFocused}
            highlightActiveLine={highlightActiveLine}
            scrollTop={scrollTop}
          />
        )}

        {/* Code area */}
        <div 
          ref={codeAreaRef}
          style={{ 
            flex: 1, 
            position: 'relative', 
            overflow: 'hidden',
          }}
        >
          {/* 移除活跃行和选中行的黑色背景高亮功能 */}

          {/* Textarea - 简化选中样式，只关注文本内容，z-index设为1 */}
          <textarea
            ref={textareaRef}
            className="code-editor-textarea"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onClick={debouncedUpdateCursor}
            onKeyUp={debouncedUpdateCursor}
            readOnly={readOnly}
            placeholder={placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            data-gramm="false"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              padding: '10px 12px',
              margin: 0,
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: 'transparent',
              color: 'transparent',
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
              fontSize,
              lineHeight: `${lineHeight}px`,
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              wordWrap: wordWrap ? 'break-word' : 'normal',
              overflowWrap: wordWrap ? 'break-word' : 'normal',
              tabSize,
              zIndex: 1, // 降低z-index，让文本显示在上面
              WebkitTextFillColor: 'transparent',
              caretColor: 'var(--text-editor, #e0e0e0)',
              boxSizing: 'border-box',
              // 确保字体渲染一致
              fontSmooth: 'never',
              WebkitFontSmoothing: 'none',
              MozOsxFontSmoothing: 'none',
              // 简化选中文本样式，只关注文本内容
              '::selection': {
                background: 'rgba(100, 150, 255, 0.3)',
                color: 'inherit',
              },
              '::-moz-selection': {
                background: 'rgba(100, 150, 255, 0.3)',
                color: 'inherit',
              },
            }}
          />

          {/* Syntax highlighted overlay - z-index设为2，显示在上面 */}
          <div
            ref={highlightRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              padding: '10px 12px',
              pointerEvents: 'none',
              zIndex: 2, // 提高z-index，让文本显示在选中背景上面
              boxSizing: 'border-box',
              overflow: 'auto',
              // 确保字体渲染一致
              fontSmooth: 'never',
              WebkitFontSmoothing: 'none',
              MozOsxFontSmoothing: 'none',
            }}
          >
            <HighlightedContent
              content={value}
              language={language}
              fontSize={fontSize}
              lineHeight={lineHeight}
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 12px',
          background: 'var(--bg-editor-gutter, #252526)',
          borderTop: '1px solid var(--border-color, #3c3c3c)',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          color: 'var(--text-editor-line-number, #828997)',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 16 }}>
          <span>行 {cursorLine}, 列 {cursorCol}</span>
          <span>{lineCount} 行</span>
          <span>{value.length} 字符</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <span>{language.toUpperCase()}</span>
          {readOnly && <span style={{ color: 'var(--ini-value, #abb2bf)' }}>只读</span>}
          <span>UTF-8</span>
          <span>空格: {tabSize}</span>
        </div>
      </div>
    </div>
  );
}

export default CodeEditor;