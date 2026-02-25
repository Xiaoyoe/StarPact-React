import React, { useRef, useCallback, useEffect, useState } from 'react';
import { NovelEditor } from '@/components/NovelEditor';
import { useToast } from '@/components/Toast';
import { getTimestamp } from '@/utils/diffEngine';

import { useCompareState } from './hooks/useCompareState';
import { useSavedFiles } from './hooks/useSavedFiles';
import { useAutoSave } from './hooks/useAutoSave';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

import { SaveModal } from './components/SaveModal';
import { DiffResultView } from './components/DiffResultView';
import { Splitter } from './components/Splitter';
import { SavedItem } from './components/SavedItem';
import { CompareStatsView } from './components/CompareStats';
import { FloatingToolbar } from './components/FloatingToolbar';

import styles from './styles/index.module.css';

export function ComparePage() {
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSide, setModalSide] = useState<'left' | 'right'>('left');

  const [state, actions] = useCompareState();
  const { savedFiles, saveFile, loadFile, deleteFile } = useSavedFiles();

  const handleAutoSaveNotify = useCallback(() => {
    toast.success('自动保存成功', { duration: 2000 });
  }, [toast]);

  const { autoSaveEnabled, setAutoSaveEnabled, loadSavedContent, saveContent } = useAutoSave(
    state.leftText,
    state.rightText,
    handleAutoSaveNotify
  );

  useEffect(() => {
    const loadSaved = async () => {
      const saved = await loadSavedContent();
      if (saved) {
        actions.setLeftText(saved.left);
        actions.setRightText(saved.right);
        toast.info('已自动加载上次保存的内容');
      }
    };
    loadSaved();
  }, []);

  const handleCompare = useCallback(() => {
    if (!state.leftText.trim() && !state.rightText.trim()) {
      toast.error('请输入文本后再进行对比');
      return;
    }
    actions.handleCompare();
    toast.success('对比完成');
  }, [state.leftText, state.rightText, actions, toast]);

  const handleClear = useCallback(() => {
    actions.handleClear();
    toast.info('已清空所有内容');
  }, [actions, toast]);

  const handleClearStyles = useCallback(() => {
    actions.handleClearStyles();
    toast.info('样式已清空');
  }, [actions, toast]);

  const handleSaveLeft = useCallback(async () => {
    if (!state.leftText.trim()) {
      toast.error('左侧内容为空，无法保存');
      return;
    }
    const name = await saveFile('left', state.leftText);
    toast.success(`保存成功：${name}`);
  }, [state.leftText, saveFile, toast]);

  const handleSaveRight = useCallback(async () => {
    if (!state.rightText.trim()) {
      toast.error('右侧内容为空，无法保存');
      return;
    }
    const name = await saveFile('right', state.rightText);
    toast.success(`保存成功：${name}`);
  }, [state.rightText, saveFile, toast]);

  const handleCustomSave = useCallback((side: 'left' | 'right') => {
    setModalSide(side);
    setModalVisible(true);
  }, []);

  const handleModalSave = useCallback(async (name: string) => {
    const content = modalSide === 'left' ? state.leftText : state.rightText;
    if (!content.trim()) {
      toast.error(`${modalSide === 'left' ? '左侧' : '右侧'}内容为空，无法保存`);
      return;
    }
    await saveFile(modalSide, content, name);
    setModalVisible(false);
    toast.success(`保存成功：${name}`);
  }, [modalSide, state.leftText, state.rightText, saveFile, toast]);

  const handleLoadFile = useCallback((file: typeof savedFiles[0]) => {
    const content = loadFile(file);
    actions.setRightText(content);
    toast.success(`已加载：${file.name}`);
  }, [actions, loadFile, toast]);

  const handleDeleteFile = useCallback(async (id: string) => {
    await deleteFile(id);
    toast.success('删除成功');
  }, [deleteFile, toast]);

  const handleExportResult = useCallback(() => {
    if (state.diffLines.length === 0) {
      toast.error('没有对比结果可导出');
      return;
    }

    let md = '# 文本对比结果\n\n';
    md += `> 导出时间：${new Date().toLocaleString()}\n\n`;
    md += '```diff\n';
    for (const line of state.diffLines) {
      const content = line.type === 'hunk' && line.simplified ? line.simplified : line.content;
      md += content + '\n';
    }
    md += '```\n';

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diff_result_${getTimestamp()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('导出成功');
  }, [state.diffLines, toast]);

  const handleManualSave = useCallback(async () => {
    await saveContent(state.leftText, state.rightText);
    toast.success('手动保存成功');
  }, [state.leftText, state.rightText, saveContent, toast]);

  const handleSplitterDrag = useCallback((dx: number) => {
    if (!containerRef.current) return;
    actions.handleSplitterDrag(dx, containerRef.current.offsetWidth);
  }, [actions]);

  useKeyboardShortcuts({
    onCompare: handleCompare,
    onSave: handleManualSave,
    onClear: handleClear,
    onCloseModal: () => setModalVisible(false),
    enabled: !modalVisible,
  });

  return (
    <div className={styles.comparePage}>
      <SaveModal
        visible={modalVisible}
        onSave={handleModalSave}
        onCancel={() => setModalVisible(false)}
      />

      {savedFiles.length > 0 && (
        <div className={styles.savedFilesBar}>
          <span className={styles.savedFilesLabel}>已保存:</span>
          {savedFiles.map(f => (
            <SavedItem
              key={f.id}
              file={f}
              onClick={() => handleLoadFile(f)}
              onDelete={() => handleDeleteFile(f.id)}
            />
          ))}
        </div>
      )}

      <CompareStatsView stats={state.stats} visible={state.diffReady && state.viewMode === 'diff'} />

      <div ref={containerRef} className={styles.mainContent}>
        {state.viewMode === 'editor' ? (
          <>
            <div 
              className={styles.editorPane}
              style={{ width: `${state.leftWidth}%`, minWidth: '20%', maxWidth: '80%' }}
            >
              <NovelEditor
                value={state.leftText}
                onChange={actions.setLeftText}
                placeholder="在此输入原始文本..."
                diffs={state.leftDiffs}
                fontSize={state.fontSize}
                label="原始文本 (左侧)"
                showLineNumbers
              />
            </div>

            <Splitter onDrag={handleSplitterDrag} />

            <div className={styles.editorPane} style={{ flex: 1 }}>
              <NovelEditor
                value={state.rightText}
                onChange={actions.setRightText}
                placeholder="在此输入修改后文本..."
                diffs={state.rightDiffs}
                fontSize={state.fontSize}
                label="修改后文本 (右侧)"
                showLineNumbers
              />
            </div>
          </>
        ) : (
          <div className={styles.diffResultPane}>
            <DiffResultView diffLines={state.diffLines} fontSize={state.fontSize} />
          </div>
        )}

        <FloatingToolbar
          onCompare={handleCompare}
          onToggleView={actions.handleToggleView}
          onSaveLeft={handleSaveLeft}
          onSaveRight={handleSaveRight}
          onCustomSaveLeft={() => handleCustomSave('left')}
          onCustomSaveRight={() => handleCustomSave('right')}
          onManualSave={handleManualSave}
          onExportResult={handleExportResult}
          onClear={handleClear}
          onClearStyles={handleClearStyles}
          onFontIncrease={actions.handleFontIncrease}
          onFontDecrease={actions.handleFontDecrease}
          onFontReset={actions.handleFontReset}
          diffReady={state.diffReady}
          viewMode={state.viewMode}
          fontSize={state.fontSize}
        />
      </div>

      <div className={styles.statusBar}>
        <div className={styles.statusInfo}>
          <span>左侧: {state.leftText.split('\n').length} 行, {state.leftText.length} 字符</span>
          <span>右侧: {state.rightText.split('\n').length} 行, {state.rightText.length} 字符</span>
        </div>
        <div className={styles.statusActions}>
          <label className={styles.autoSaveLabel}>
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={e => setAutoSaveEnabled(e.target.checked)}
            />
            自动保存
          </label>
        </div>
      </div>
    </div>
  );
}
