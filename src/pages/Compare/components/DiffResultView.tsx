import React from 'react';
import type { UnifiedDiffLine } from '@/utils/diffEngine';
import styles from '../styles/index.module.css';

interface DiffResultViewProps {
  diffLines: UnifiedDiffLine[];
  fontSize: number;
}

export function DiffResultView({ diffLines, fontSize }: DiffResultViewProps) {
  if (diffLines.length === 0) {
    return (
      <div className={styles.diffEmpty}>
        点击"一键对比"查看差异结果
      </div>
    );
  }

  const getLineStyle = (type: UnifiedDiffLine['type']): string => {
    switch (type) {
      case 'file-old':
      case 'file-new':
        return styles.diffLineFile;
      case 'hunk':
        return styles.diffLineHunk;
      case 'add':
        return styles.diffLineAdd;
      case 'delete':
        return styles.diffLineDelete;
      case 'context':
      default:
        return styles.diffLineContext;
    }
  };

  return (
    <div 
      className={styles.diffResultView}
      style={{ fontSize, lineHeight: `${fontSize * 1.6}px` }}
    >
      <div className={styles.diffHeader} style={{ fontSize: fontSize + 2 }}>
        Git风格对比结果：
      </div>
      <div className={styles.diffSeparator}>
        {'='.repeat(60)}
      </div>

      {diffLines.map((line, i) => {
        const displayContent = line.type === 'hunk' && line.simplified
          ? line.simplified
          : line.content;

        return (
          <div
            key={i}
            className={`${styles.diffLine} ${getLineStyle(line.type)}`}
          >
            {displayContent}
          </div>
        );
      })}
    </div>
  );
}
