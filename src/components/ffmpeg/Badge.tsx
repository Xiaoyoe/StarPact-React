import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'cyan';
}

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'var(--primary-light)', text: 'var(--primary-color)', border: 'var(--primary-color)' },
  green: { bg: 'rgba(16, 185, 129, 0.15)', text: 'var(--success-color)', border: 'var(--success-color)' },
  orange: { bg: 'rgba(245, 158, 11, 0.15)', text: 'var(--warning-color)', border: 'var(--warning-color)' },
  red: { bg: 'rgba(239, 68, 68, 0.15)', text: 'var(--error-color)', border: 'var(--error-color)' },
  purple: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', border: '#8b5cf6' },
  cyan: { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4', border: '#06b6d4' },
};

export function Badge({ children, color = 'blue' }: BadgeProps) {
  const colors = colorMap[color];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}40`,
      }}
    >
      {children}
    </span>
  );
}
