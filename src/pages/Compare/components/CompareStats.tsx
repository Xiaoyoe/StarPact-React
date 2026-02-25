import React from 'react';
import type { CompareStats } from '../hooks/useCompareState';
import styles from '../styles/index.module.css';

interface CompareStatsViewProps {
  stats: CompareStats | null;
  visible: boolean;
}

export function CompareStatsView({ stats, visible }: CompareStatsViewProps) {
  if (!visible || !stats) return null;

  return (
    <div className={styles.compareStats}>
      <div className={styles.statItem}>
        <span className={styles.statLabel}>新增:</span>
        <span className={`${styles.statValue} ${styles.statAdded}`}>{stats.addedLines} 行</span>
      </div>
      <div className={styles.statItem}>
        <span className={styles.statLabel}>删除:</span>
        <span className={`${styles.statValue} ${styles.statDeleted}`}>{stats.deletedLines} 行</span>
      </div>
      <div className={styles.statItem}>
        <span className={styles.statLabel}>相同:</span>
        <span className={`${styles.statValue} ${styles.statSame}`}>{stats.sameLines} 行</span>
      </div>
      <div className={styles.statItem}>
        <span className={styles.statLabel}>新增字符:</span>
        <span className={`${styles.statValue} ${styles.statAdded}`}>{stats.addedChars}</span>
      </div>
      <div className={styles.statItem}>
        <span className={styles.statLabel}>删除字符:</span>
        <span className={`${styles.statValue} ${styles.statDeleted}`}>{stats.deletedChars}</span>
      </div>
    </div>
  );
}
