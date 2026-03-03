import React from 'react';

interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          style={{
            backgroundColor: active === t.key ? 'var(--primary-light)' : 'transparent',
            color: active === t.key ? 'var(--primary-color)' : 'var(--text-secondary)',
          }}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
