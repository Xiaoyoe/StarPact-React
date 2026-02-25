import React, { useState } from 'react';
import { ToolButton } from './ToolButton';
import styles from '../styles/index.module.css';

interface FloatingToolbarProps {
  onCompare: () => void;
  onToggleView: () => void;
  onSaveLeft: () => void;
  onSaveRight: () => void;
  onCustomSaveLeft: () => void;
  onCustomSaveRight: () => void;
  onManualSave: () => void;
  onExportResult: () => void;
  onClear: () => void;
  onClearStyles: () => void;
  onFontIncrease: () => void;
  onFontDecrease: () => void;
  onFontReset: () => void;
  diffReady: boolean;
  viewMode: 'editor' | 'diff';
  fontSize: number;
}

const ALL_GROUPS = ['compare', 'save', 'export', 'clear', 'font'];

export function FloatingToolbar({
  onCompare,
  onToggleView,
  onSaveLeft,
  onSaveRight,
  onCustomSaveLeft,
  onCustomSaveRight,
  onManualSave,
  onExportResult,
  onClear,
  onClearStyles,
  onFontIncrease,
  onFontDecrease,
  onFontReset,
  diffReady,
  viewMode,
  fontSize,
}: FloatingToolbarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(ALL_GROUPS));

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const isGroupExpanded = (group: string) => expandedGroups.has(group);

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={`${styles.floatingToolbar} ${collapsed ? styles.floatingToolbarCollapsed : ''}`}>
      <div 
        className={styles.floatingToolbarHeader}
        onClick={collapsed ? handleToggle : undefined}
        style={collapsed ? { cursor: 'pointer' } : undefined}
      >
        <span className={styles.floatingToolbarTitle}>工具箱</span>
        {!collapsed && (
          <button 
            className={styles.floatingToolbarToggle}
            onClick={handleToggle}
            title="收起"
          >
            ▶
          </button>
        )}
      </div>

      {!collapsed && (
        <div className={styles.floatingToolbarContent}>
          <div className={styles.floatingToolbarSection}>
            <div 
              className={styles.floatingToolbarSectionHeader}
              onClick={() => toggleGroup('compare')}
            >
              <span className={styles.sectionIcon}>⚡</span>
              <span className={styles.sectionTitle}>对比操作</span>
              <span className={styles.sectionArrow}>{isGroupExpanded('compare') ? '▼' : '▶'}</span>
            </div>
            {isGroupExpanded('compare') && (
              <div className={styles.floatingToolbarSectionContent}>
                <ToolButton onClick={onCompare} variant="primary" small>一键对比</ToolButton>
                <ToolButton
                  onClick={onToggleView}
                  disabled={!diffReady}
                  variant="secondary"
                  small
                >
                  {viewMode === 'editor' ? '查看结果' : '查看原文'}
                </ToolButton>
              </div>
            )}
          </div>

          <div className={styles.floatingToolbarSection}>
            <div 
              className={styles.floatingToolbarSectionHeader}
              onClick={() => toggleGroup('save')}
            >
              <span className={styles.sectionIcon}>💾</span>
              <span className={styles.sectionTitle}>保存操作</span>
              <span className={styles.sectionArrow}>{isGroupExpanded('save') ? '▼' : '▶'}</span>
            </div>
            {isGroupExpanded('save') && (
              <div className={styles.floatingToolbarSectionContent}>
                <ToolButton onClick={onSaveLeft} variant="success" small>保存左侧</ToolButton>
                <ToolButton onClick={onSaveRight} variant="success" small>保存右侧</ToolButton>
                <ToolButton onClick={onCustomSaveLeft} variant="secondary" small>自定义左</ToolButton>
                <ToolButton onClick={onCustomSaveRight} variant="secondary" small>自定义右</ToolButton>
                <ToolButton onClick={onManualSave} variant="secondary" small>手动保存</ToolButton>
              </div>
            )}
          </div>

          <div className={styles.floatingToolbarSection}>
            <div 
              className={styles.floatingToolbarSectionHeader}
              onClick={() => toggleGroup('export')}
            >
              <span className={styles.sectionIcon}>📤</span>
              <span className={styles.sectionTitle}>导出操作</span>
              <span className={styles.sectionArrow}>{isGroupExpanded('export') ? '▼' : '▶'}</span>
            </div>
            {isGroupExpanded('export') && (
              <div className={styles.floatingToolbarSectionContent}>
                <ToolButton onClick={onExportResult} variant="warning" disabled={!diffReady} small>
                  导出结果
                </ToolButton>
              </div>
            )}
          </div>

          <div className={styles.floatingToolbarSection}>
            <div 
              className={styles.floatingToolbarSectionHeader}
              onClick={() => toggleGroup('clear')}
            >
              <span className={styles.sectionIcon}>🗑️</span>
              <span className={styles.sectionTitle}>清空操作</span>
              <span className={styles.sectionArrow}>{isGroupExpanded('clear') ? '▼' : '▶'}</span>
            </div>
            {isGroupExpanded('clear') && (
              <div className={styles.floatingToolbarSectionContent}>
                <ToolButton onClick={onClear} variant="danger" small>清空内容</ToolButton>
                <ToolButton onClick={onClearStyles} variant="secondary" small>清空样式</ToolButton>
              </div>
            )}
          </div>

          <div className={styles.floatingToolbarSection}>
            <div 
              className={styles.floatingToolbarSectionHeader}
              onClick={() => toggleGroup('font')}
            >
              <span className={styles.sectionIcon}>🔤</span>
              <span className={styles.sectionTitle}>字体大小</span>
              <span className={styles.sectionValue}>{fontSize}px</span>
              <span className={styles.sectionArrow}>{isGroupExpanded('font') ? '▼' : '▶'}</span>
            </div>
            {isGroupExpanded('font') && (
              <div className={styles.floatingToolbarSectionContent}>
                <div className={styles.fontSizeButtons}>
                  <ToolButton onClick={onFontDecrease} small>A-</ToolButton>
                  <span className={styles.fontSizeDisplay}>{fontSize}px</span>
                  <ToolButton onClick={onFontIncrease} small>A+</ToolButton>
                </div>
                <ToolButton onClick={onFontReset} variant="secondary" small>重置</ToolButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
