import React from 'react';

interface SectionCardProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, icon, children, className = '' }: SectionCardProps) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      {title && (
        <div className="flex items-center gap-2 mb-4">
          {icon && <span style={{ color: 'var(--primary-color)' }}>{icon}</span>}
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}
