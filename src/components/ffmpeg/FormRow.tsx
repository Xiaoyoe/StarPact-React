import React from 'react';

interface FormRowProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

export function FormRow({ label, children, hint }: FormRowProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
      {hint && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>}
    </div>
  );
}
