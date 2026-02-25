import React, { useState, useRef, useEffect } from 'react';
import { isValidSaveName } from '../utils/storage';
import styles from '../styles/index.module.css';

interface SaveModalProps {
  visible: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function SaveModal({ visible, onSave, onCancel }: SaveModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setName('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  if (!visible) return null;

  const handleSave = () => {
    if (!name.trim()) {
      setError('名称不能为空');
      return;
    }
    if (!isValidSaveName(name)) {
      setError('只能输入英文、数字和下划线');
      return;
    }
    onSave(name);
  };

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>自定义保存名称</h3>
        <input
          ref={inputRef}
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="输入名称（英文、数字、下划线）"
          className={`${styles.modalInput} ${error ? styles.modalInputError : ''}`}
        />
        {error && <p className={styles.modalError}>{error}</p>}
        <div className={styles.modalActions}>
          <button onClick={onCancel} className={`${styles.toolButton} ${styles.toolButtonSecondary}`}>
            取消
          </button>
          <button onClick={handleSave} className={`${styles.toolButton} ${styles.toolButtonPrimary}`}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
