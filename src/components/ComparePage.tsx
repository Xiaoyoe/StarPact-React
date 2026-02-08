import { useState, useEffect, useRef } from 'react';
import {
  FileText, Copy, Trash2, Download, Upload, Save,
  Minus, Plus, RotateCcw, Check, X, ChevronRight, Link2, Link2Off
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SavedContent {
  name: string;
  content: string;
  side: 'left' | 'right';
}

interface DiffLine {
  left: string;
  right: string;
  status: 'same' | 'different' | 'left-only' | 'right-only';
}

export function ComparePage() {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [savedContents, setSavedContents] = useState<SavedContent[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  const [diffResult, setDiffResult] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSide, setSaveSide] = useState<'left' | 'right'>('left');
  const [saveName, setSaveName] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [leftWidth, setLeftWidth] = useState(50);
  const [syncScroll, setSyncScroll] = useState(false);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [showEditorHighlight, setShowEditorHighlight] = useState(false);

  const leftEditorRef = useRef<HTMLTextAreaElement>(null);
  const rightEditorRef = useRef<HTMLTextAreaElement>(null);
  const leftLineNumbersRef = useRef<HTMLDivElement>(null);
  const rightLineNumbersRef = useRef<HTMLDivElement>(null);
  const leftEditorContainerRef = useRef<HTMLDivElement>(null);
  const rightEditorContainerRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

  useEffect(() => {
    loadSavedContents();
    loadAutoSavedContent();
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (autoSaveEnabled) {
      autoSaveTimerRef.current = setInterval(() => {
        localStorage.setItem('autoSaveLeft', leftText);
        localStorage.setItem('autoSaveRight', rightText);
      }, 30000);
    } else {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [autoSaveEnabled, leftText, rightText]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSavedContents = () => {
    const saved = JSON.parse(localStorage.getItem('savedContents') || '[]');
    setSavedContents(saved);
  };

  const loadAutoSavedContent = () => {
    const autoSaveLeft = localStorage.getItem('autoSaveLeft');
    const autoSaveRight = localStorage.getItem('autoSaveRight');
    if (autoSaveLeft) setLeftText(autoSaveLeft);
    if (autoSaveRight) setRightText(autoSaveRight);
  };

  const handleSaveContent = (side: 'left' | 'right') => {
    setSaveSide(side);
    setSaveName(`${side === 'left' ? '左侧' : '右侧'}内容_${Date.now()}`);
    setShowSaveModal(true);
  };

  const confirmSave = () => {
    if (!saveName.trim()) {
      showToast('请输入保存名称', 'error');
      return;
    }
    const content = saveSide === 'left' ? leftText : rightText;
    const newSaved = [...savedContents, { name: saveName, content, side: saveSide }];
    setSavedContents(newSaved);
    localStorage.setItem('savedContents', JSON.stringify(newSaved));
    setShowSaveModal(false);
    showToast(`已保存：${saveName}`, 'success');
  };

  const handleLoadContent = (item: SavedContent) => {
    if (item.side === 'left') {
      setLeftText(item.content);
    } else {
      setRightText(item.content);
    }
    setShowEditorHighlight(false);
    showToast(`已加载：${item.name}`, 'success');
  };

  const handleDeleteContent = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = savedContents.filter((_, i) => i !== index);
    setSavedContents(newSaved);
    localStorage.setItem('savedContents', JSON.stringify(newSaved));
    showToast('已删除保存的内容', 'info');
  };

  const handleCompare = () => {
    const leftLines = leftText.split('\n');
    const rightLines = rightText.split('\n');
    const maxLines = Math.max(leftLines.length, rightLines.length);

    const newDiffLines: DiffLine[] = [];
    for (let i = 0; i < maxLines; i++) {
      const leftLine = leftLines[i] || '';
      const rightLine = rightLines[i] || '';

      if (leftLine === rightLine) {
        newDiffLines.push({ left: leftLine, right: rightLine, status: 'same' });
      } else if (leftLine && !rightLine) {
        newDiffLines.push({ left: leftLine, right: '', status: 'left-only' });
      } else if (!leftLine && rightLine) {
        newDiffLines.push({ left: '', right: rightLine, status: 'right-only' });
      } else {
        newDiffLines.push({ left: leftLine, right: rightLine, status: 'different' });
      }
    }

    setDiffLines(newDiffLines);

    let diffHtml = '';
    diffHtml += `<div style="color: var(--primary-color); font-weight: bold;">--- 左侧内容</div>`;
    diffHtml += `<div style="color: var(--primary-color); font-weight: bold;">+++ 右侧内容</div>`;
    diffHtml += `<div style="color: var(--primary-color); font-weight: bold;">@@ -1,${leftLines.length} +1,${rightLines.length} @@</div>`;

    for (let i = 0; i < maxLines; i++) {
      const leftLine = leftLines[i] || '';
      const rightLine = rightLines[i] || '';

      if (leftLine === rightLine) {
        diffHtml += `<div style="color: var(--success-color);"> ${leftLine}</div>`;
      } else if (leftLine && !rightLine) {
        diffHtml += `<div style="background-color: rgba(245, 63, 63, 0.1); color: var(--error-color);">-${leftLine}</div>`;
      } else if (!leftLine && rightLine) {
        diffHtml += `<div style="background-color: rgba(0, 180, 42, 0.1); color: var(--success-color);">+${rightLine}</div>`;
      } else {
        diffHtml += `<div style="background-color: rgba(245, 63, 63, 0.1); color: var(--error-color);">-${leftLine}</div>`;
        diffHtml += `<div style="background-color: rgba(0, 180, 42, 0.1); color: var(--success-color);">+${rightLine}</div>`;
      }
    }

    diffHtml += `<div style="color: var(--primary-color); font-weight: bold; margin-top: 16px;">=== 结构对比 ===</div>`;
    diffHtml += `<div>左侧行数: ${leftLines.length} | 右侧行数: ${rightLines.length}</div>`;
    diffHtml += `<div>左侧段落数: ${leftText.split(/\n\s*\n/).length} | 右侧段落数: ${rightText.split(/\n\s*\n/).length}</div>`;

    setDiffResult(diffHtml);
    setShowDiff(true);
    setShowEditorHighlight(true);
    showToast('对比完成', 'success');
  };

  const handleClearContent = () => {
    setLeftText('');
    setRightText('');
    setDiffResult('');
    setDiffLines([]);
    setShowDiff(false);
    setShowEditorHighlight(false);
    showToast('内容已清空', 'info');
  };

  const handleClearStyle = () => {
    setLeftText(leftText.replace(/<[^>]*>/g, ''));
    setRightText(rightText.replace(/<[^>]*>/g, ''));
    showToast('样式已清空', 'info');
  };

  const handleSaveResult = () => {
    const blob = new Blob([diffResult], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `文本对比结果_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('对比结果已导出为Markdown', 'success');
  };

  const adjustFontSize = (delta: number) => {
    const newSize = Math.max(6, Math.min(18, fontSize + delta));
    setFontSize(newSize);
    showToast(`字体大小: ${newSize}px`, 'info');
  };

  const resetFontSize = () => {
    setFontSize(12);
    showToast('字体大小已重置', 'info');
  };

  const getLineNumbers = (text: string) => {
    const lines = text.split('\n');
    return Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i + 1);
  };

  const handleLeftScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    
    if (leftLineNumbersRef.current) {
      leftLineNumbersRef.current.scrollTop = target.scrollTop;
    }

    if (syncScroll && !isScrollingRef.current.right) {
      isScrollingRef.current.left = true;
      if (rightEditorRef.current) {
        rightEditorRef.current.scrollTop = target.scrollTop;
        rightEditorRef.current.scrollLeft = target.scrollLeft;
      }
      if (rightLineNumbersRef.current) {
        rightLineNumbersRef.current.scrollTop = target.scrollTop;
      }
      setTimeout(() => {
        isScrollingRef.current.left = false;
      }, 50);
    }
  };

  const handleRightScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    
    if (rightLineNumbersRef.current) {
      rightLineNumbersRef.current.scrollTop = target.scrollTop;
    }

    if (syncScroll && !isScrollingRef.current.left) {
      isScrollingRef.current.right = true;
      if (leftEditorRef.current) {
        leftEditorRef.current.scrollTop = target.scrollTop;
        leftEditorRef.current.scrollLeft = target.scrollLeft;
      }
      if (leftLineNumbersRef.current) {
        leftLineNumbersRef.current.scrollTop = target.scrollTop;
      }
      setTimeout(() => {
        isScrollingRef.current.right = false;
      }, 50);
    }
  };

  const getLineStyle = (status: DiffLine['status']) => {
    if (status === 'same') {
      return { backgroundColor: 'rgba(0, 180, 42, 0.15)', color: 'var(--success-color)' };
    } else if (status === 'different') {
      return { backgroundColor: 'rgba(245, 63, 63, 0.15)', color: 'var(--error-color)' };
    } else if (status === 'left-only') {
      return { backgroundColor: 'rgba(245, 63, 63, 0.15)', color: 'var(--error-color)' };
    } else if (status === 'right-only') {
      return { backgroundColor: 'rgba(245, 63, 63, 0.15)', color: 'var(--error-color)' };
    }
    return {};
  };

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* 顶部工具栏 */}
      <div
        className="flex items-center gap-2 border-b px-4 py-2"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <FileText size={18} style={{ color: 'var(--primary-color)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--primary-color)' }}>
            保存的内容：
          </span>
        </div>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-2">
            <AnimatePresence>
              {savedContents.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 cursor-pointer transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                  }}
                  onClick={() => handleLoadContent(item)}
                >
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {item.name}
                  </span>
                  <button
                    onClick={(e) => handleDeleteContent(index, e)}
                    className="flex h-4 w-4 items-center justify-center rounded-full transition-colors"
                    style={{ backgroundColor: 'var(--error-color)', color: 'var(--text-inverse)' }}
                  >
                    <X size={8} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="relative flex flex-1 gap-1 p-3 overflow-hidden">
        {/* 编辑器视图 */}
        <AnimatePresence mode="wait">
          {!showDiff && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full gap-1"
            >
              {/* 左侧编辑器 */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                ref={leftEditorContainerRef}
                className="flex rounded-lg overflow-hidden border"
                style={{
                  width: `${leftWidth}%`,
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div
                  ref={leftLineNumbersRef}
                  className="flex flex-col items-end justify-start py-2 pr-2 select-none overflow-hidden"
                  style={{
                    width: '50px',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontSize: `${fontSize}px`,
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {getLineNumbers(leftText).map((num) => (
                    <div key={num} className="leading-[1.4]">
                      {num}
                    </div>
                  ))}
                </div>
                <textarea
                  ref={leftEditorRef}
                  value={leftText}
                  onChange={(e) => setLeftText(e.target.value)}
                  onScroll={handleLeftScroll}
                  placeholder="在此输入或粘贴要对比的原始文本..."
                  className="flex-1 resize-none bg-transparent p-2 outline-none overflow-auto"
                  style={{
                    fontSize: `${fontSize}px`,
                    color: 'var(--text-primary)',
                    fontFamily: 'Consolas, Monaco, Fira Code, Source Code Pro, monospace',
                    lineHeight: 1.4,
                  }}
                />
              </motion.div>

              {/* 分割器 */}
              <div
                className="w-1 cursor-col-resize transition-colors hover:opacity-100"
                style={{ backgroundColor: 'var(--border-color)' }}
                onMouseDown={(e) => {
                  const startX = e.clientX;
                  const startWidth = leftWidth;
                  const container = e.currentTarget.parentElement;
                  if (!container) return;

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const containerRect = container.getBoundingClientRect();
                    const deltaX = moveEvent.clientX - startX;
                    const deltaPercent = (deltaX / containerRect.width) * 100;
                    const newWidth = Math.max(20, Math.min(80, startWidth + deltaPercent));
                    setLeftWidth(newWidth);
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />

              {/* 右侧编辑器 */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                ref={rightEditorContainerRef}
                className="flex flex-1 rounded-lg overflow-hidden border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div
                  ref={rightLineNumbersRef}
                  className="flex flex-col items-end justify-start py-2 pr-2 select-none overflow-hidden"
                  style={{
                    width: '50px',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontSize: `${fontSize}px`,
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {getLineNumbers(rightText).map((num) => (
                    <div key={num} className="leading-[1.4]">
                      {num}
                    </div>
                  ))}
                </div>
                <textarea
                  ref={rightEditorRef}
                  value={rightText}
                  onChange={(e) => setRightText(e.target.value)}
                  onScroll={handleRightScroll}
                  placeholder="在此输入或粘贴要对比的修改文本..."
                  className="flex-1 resize-none bg-transparent p-2 outline-none overflow-auto"
                  style={{
                    fontSize: `${fontSize}px`,
                    color: 'var(--text-primary)',
                    fontFamily: 'Consolas, Monaco, Fira Code, Source Code Pro, monospace',
                    lineHeight: 1.4,
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 对比结果视图 */}
        <AnimatePresence mode="wait">
          {showDiff && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-3 rounded-lg border overflow-hidden flex flex-col"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
              }}
            >
              <div
                className="border-b px-4 py-2 flex-shrink-0"
                style={{ borderColor: 'var(--border-light)' }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--primary-color)' }}>
                  对比区别显示 (Git风格)
                </span>
              </div>
              <div
                className="flex-1 p-4 overflow-auto"
                style={{
                  fontSize: `${fontSize}px`,
                  color: 'var(--text-primary)',
                  fontFamily: 'Consolas, Monaco, Fira Code, Source Code Pro, monospace',
                  lineHeight: 1.4,
                }}
                dangerouslySetInnerHTML={{ __html: diffResult }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 编辑器高亮视图 */}
        <AnimatePresence mode="wait">
          {showEditorHighlight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-3 rounded-lg border overflow-hidden flex flex-col"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
              }}
            >
              <div
                className="border-b px-4 py-2 flex-shrink-0"
                style={{ borderColor: 'var(--border-light)' }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--primary-color)' }}>
                  编辑器差异高亮
                </span>
              </div>
              <div className="flex flex-1 overflow-hidden">
                {/* 左侧高亮编辑器 */}
                <div
                  className="flex rounded-lg overflow-hidden border"
                  style={{
                    width: `${leftWidth}%`,
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <div
                    className="flex flex-col items-end justify-start py-2 pr-2 select-none overflow-hidden"
                    style={{
                      width: '50px',
                      backgroundColor: 'var(--bg-tertiary)',
                      fontSize: `${fontSize}px`,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {getLineNumbers(leftText).map((num) => (
                      <div key={num} className="leading-[1.4]">
                        {num}
                      </div>
                    ))}
                  </div>
                  <div
                    className="flex-1 p-2 overflow-auto"
                    style={{
                      fontSize: `${fontSize}px`,
                      fontFamily: 'Consolas, Monaco, Fira Code, Source Code Pro, monospace',
                      lineHeight: 1.4,
                    }}
                  >
                    {diffLines.map((line, index) => (
                      <div
                        key={index}
                        style={{
                          ...getLineStyle(line.status),
                          padding: '2px 4px',
                          margin: '0',
                        }}
                      >
                        {line.left}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 分割器 */}
                <div
                  className="w-1"
                  style={{ backgroundColor: 'var(--border-color)' }}
                />

                {/* 右侧高亮编辑器 */}
                <div
                  className="flex flex-1 rounded-lg overflow-hidden border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <div
                    className="flex flex-col items-end justify-start py-2 pr-2 select-none overflow-hidden"
                    style={{
                      width: '50px',
                      backgroundColor: 'var(--bg-tertiary)',
                      fontSize: `${fontSize}px`,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {getLineNumbers(rightText).map((num) => (
                      <div key={num} className="leading-[1.4]">
                        {num}
                      </div>
                    ))}
                  </div>
                  <div
                    className="flex-1 p-2 overflow-auto"
                    style={{
                      fontSize: `${fontSize}px`,
                      fontFamily: 'Consolas, Monaco, Fira Code, Source Code Pro, monospace',
                      lineHeight: 1.4,
                    }}
                  >
                    {diffLines.map((line, index) => (
                      <div
                        key={index}
                        style={{
                          ...getLineStyle(line.status),
                          padding: '2px 4px',
                          margin: '0',
                        }}
                      >
                        {line.right}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部工具栏 */}
      <div
        className="flex items-center justify-between border-t px-4 py-2 flex-shrink-0"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              autoSaveEnabled ? 'active' : ''
            }`}
            style={{
              backgroundColor: autoSaveEnabled ? 'var(--success-color)' : 'var(--bg-tertiary)',
              color: autoSaveEnabled ? 'var(--text-inverse)' : 'var(--text-secondary)',
            }}
          >
            <Save size={12} />
            {autoSaveEnabled ? '自动保存(开启)' : '自动保存'}
          </button>
          <button
            onClick={handleClearContent}
            className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            清空内容
          </button>
          <button
            onClick={handleClearStyle}
            className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            清空样式
          </button>
          <button
            onClick={() => handleSaveContent('left')}
            className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            保存左侧对比
          </button>
          <button
            onClick={() => handleSaveContent('right')}
            className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            保存右侧对比
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            字体大小：
          </span>
          <button
            onClick={() => adjustFontSize(-2)}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            <Minus size={12} />
            -2px
          </button>
          <button
            onClick={() => adjustFontSize(2)}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            <Plus size={12} />
            +2px
          </button>
          <button
            onClick={resetFontSize}
            className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            重置字体
          </button>
          <button
            onClick={() => setSyncScroll(!syncScroll)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              syncScroll ? 'active' : ''
            }`}
            style={{
              backgroundColor: syncScroll ? 'var(--primary-color)' : 'var(--bg-tertiary)',
              color: syncScroll ? 'var(--text-inverse)' : 'var(--text-secondary)',
            }}
          >
            {syncScroll ? <Link2 size={12} /> : <Link2Off size={12} />}
            {syncScroll ? '同步滚动(开启)' : '同步滚动'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveResult}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            <Download size={12} />
            保存结果
          </button>
          <button
            onClick={handleCompare}
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
            style={{
              backgroundColor: 'var(--primary-color)',
              color: 'var(--text-inverse)',
            }}
          >
            一键对比
          </button>
          <button
            onClick={() => {
              if (showEditorHighlight) {
                setShowEditorHighlight(false);
                setShowDiff(false);
              } else if (showDiff) {
                setShowDiff(false);
              } else {
                setShowDiff(true);
              }
            }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            {showEditorHighlight ? '显示原始内容' : showDiff ? '显示编辑器高亮' : '显示对比结果'}
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* 保存弹窗 */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-lg p-5 w-80"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: `1px solid var(--primary-color)`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--primary-color)' }}>
                保存内容
              </h3>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="请输入保存名称"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-4"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: `1px solid var(--border-color)`,
                  color: 'var(--text-primary)',
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="rounded-full px-4 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={confirmSave}
                  className="rounded-full px-4 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--primary-color)',
                    color: 'var(--text-inverse)',
                  }}
                >
                  保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast提示 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-lg text-xs font-medium z-50"
            style={{
              backgroundColor:
                toast.type === 'success'
                  ? 'var(--success-color)'
                  : toast.type === 'error'
                  ? 'var(--error-color)'
                  : 'var(--primary-color)',
              color: 'var(--text-inverse)',
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
