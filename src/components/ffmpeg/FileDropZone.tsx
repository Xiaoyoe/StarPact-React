import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';

interface FileDropZoneProps {
  onFiles?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
}

export function FileDropZone({ onFiles, accept, multiple = false, label }: FileDropZoneProps) {
  const [isDrag, setIsDrag] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDrag(false);
    const f = Array.from(e.dataTransfer.files);
    setFiles(f);
    onFiles?.(f);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = Array.from(e.target.files || []);
    setFiles(f);
    onFiles?.(f);
  };

  const removeFile = (idx: number) => {
    const newFiles = files.filter((_, i) => i !== idx);
    setFiles(newFiles);
    onFiles?.(newFiles);
  };

  const inputId = `file-input-${label?.replace(/\s/g, '-') || 'default'}`;

  return (
    <div>
      <div
        className={`rounded-xl p-8 text-center cursor-pointer transition-all`}
        style={{
          border: `2px dashed ${isDrag ? 'var(--primary-color)' : 'var(--border-color)'}`,
          backgroundColor: isDrag ? 'var(--primary-light)' : 'var(--bg-secondary)',
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
        onDragLeave={() => setIsDrag(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        <input
          id={inputId}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleInput}
        />
        <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label || '拖拽文件到此处，或点击选择'}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {accept ? `支持格式: ${accept}` : '支持所有媒体格式'}
        </p>
      </div>
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
              <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} style={{ color: 'var(--text-tertiary)' }} className="hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
