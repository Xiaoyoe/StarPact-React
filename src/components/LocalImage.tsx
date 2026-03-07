import { useState, useEffect, memo } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface LocalImageProps {
  path: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
}

export const LocalImage = memo(function LocalImage({ 
  path, 
  alt = '', 
  className = '', 
  style = {},
  fallback
}: LocalImageProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }

    if (path.startsWith('data:') || path.startsWith('http') || path.startsWith('/src/')) {
      setImageUrl(path);
      setLoading(false);
      return;
    }

    const loadImage = async () => {
      setLoading(true);
      setError(false);

      if (window.electronAPI?.file?.readFile) {
        try {
          const result = await window.electronAPI.file.readFile(path, 'base64');
          if (result.success && result.content) {
            const ext = path.split('.').pop()?.toLowerCase() || 'jpg';
            const mimeType = ext === 'png' ? 'image/png' : 
                            ext === 'gif' ? 'image/gif' :
                            ext === 'webp' ? 'image/webp' :
                            ext === 'bmp' ? 'image/bmp' : 'image/jpeg';
            const dataUrl = `data:${mimeType};base64,${result.content}`;
            setImageUrl(dataUrl);
          } else {
            setError(true);
          }
        } catch (err) {
          console.error('Failed to load image:', err);
          setError(true);
        }
      } else {
        setError(true);
      }
      setLoading(false);
    };

    loadImage();
  }, [path]);

  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ ...style, backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" 
          style={{ borderColor: 'var(--primary-color)', borderTopColor: 'transparent' }} 
        />
      </div>
    );
  }

  if (error || !imageUrl) {
    return fallback || (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ ...style, backgroundColor: 'var(--bg-tertiary)' }}
      >
        <ImageIcon size={20} style={{ color: 'var(--text-tertiary)' }} />
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={alt} 
      className={className}
      style={style}
      onError={() => setError(true)}
    />
  );
});
