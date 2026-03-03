import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        className={`w-9 h-5 rounded-full p-0.5 transition-colors`}
        style={{ backgroundColor: checked ? 'var(--primary-color)' : 'var(--bg-tertiary)' }}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`}
        />
      </div>
      {label && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>}
    </label>
  );
}
