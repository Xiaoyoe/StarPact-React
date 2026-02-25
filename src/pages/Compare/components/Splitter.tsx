import React, { useRef } from 'react';
import styles from '../styles/index.module.css';

interface SplitterProps {
  onDrag: (dx: number) => void;
}

export function Splitter({ onDrag }: SplitterProps) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastX.current = e.clientX;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - lastX.current;
      lastX.current = ev.clientX;
      onDrag(dx);
    };

    const handleMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div className={styles.splitter} onMouseDown={handleMouseDown}>
      <div className={styles.splitterHandle} />
    </div>
  );
}
