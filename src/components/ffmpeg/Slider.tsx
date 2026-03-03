import React from 'react';

interface SliderProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
  suffix?: string;
}

export function Slider({ value, onChange, min = 0, max = 100, label, suffix = '' }: SliderProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span className="font-mono" style={{ color: 'var(--primary-color)' }}>{value}{suffix}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--primary-color) ${((value - min) / (max - min)) * 100}%, var(--bg-tertiary) ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
    </div>
  );
}
