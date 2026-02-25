import React from 'react';
import styles from '../styles/index.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning';

interface ToolButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  title?: string;
  small?: boolean;
}

export function ToolButton({
  children,
  onClick,
  variant = 'secondary',
  disabled = false,
  title,
  small = false,
}: ToolButtonProps) {
  const variantClass = {
    primary: styles.toolButtonPrimary,
    secondary: styles.toolButtonSecondary,
    danger: styles.toolButtonDanger,
    success: styles.toolButtonSuccess,
    warning: styles.toolButtonWarning,
  }[variant];

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      className={`${styles.toolButton} ${variantClass} ${small ? styles.toolButtonSmall : ''}`}
    >
      {children}
    </button>
  );
}
