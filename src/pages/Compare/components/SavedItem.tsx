import React from 'react';
import type { SavedFile } from '../utils/storage';
import styles from '../styles/index.module.css';

interface SavedItemProps {
  file: SavedFile;
  onClick: () => void;
  onDelete: () => void;
}

export function SavedItem({ file, onClick, onDelete }: SavedItemProps) {
  return (
    <div className={styles.savedItem} onClick={onClick}>
      <span className={styles.savedItemName}>
        {file.name}
      </span>
      <span
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className={styles.savedItemDelete}
        title="删除"
      >
        ×
      </span>
    </div>
  );
}
