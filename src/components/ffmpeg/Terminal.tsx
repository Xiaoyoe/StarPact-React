import React from 'react';

interface TerminalProps {
  lines: string[];
}

export function Terminal({ lines }: TerminalProps) {
  return (
    <div
      className="rounded-lg p-3 font-mono text-xs max-h-48 overflow-y-auto"
      style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
      }}
    >
      {lines.map((l, i) => {
        let color = 'var(--text-secondary)';
        if (l.startsWith('[error]')) color = 'var(--error-color)';
        else if (l.startsWith('[info]')) color = 'var(--primary-color)';
        else if (l.startsWith('[done]')) color = 'var(--success-color)';
        
        return (
          <div key={i} className="py-0.5" style={{ color }}>
            {l}
          </div>
        );
      })}
      <div className="animate-pulse" style={{ color: 'var(--success-color)' }}>▊</div>
    </div>
  );
}
