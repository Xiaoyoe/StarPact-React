import React from 'react';

interface ProgressBarProps {
  value: number;
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span className="font-mono" style={{ color: 'var(--primary-color)' }}>{value}%</span>
        </div>
      )}
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${value}%`,
            background: 'linear-gradient(90deg, var(--primary-color), #8b5cf6)',
          }}
        />
      </div>
    </div>
  );
}
