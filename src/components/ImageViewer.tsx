import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

interface ImageViewerProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onJumpTo?: (index: number) => void;
}

export function ImageViewer({ images, currentIndex, isOpen, onClose, onPrev, onNext, onJumpTo }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrev();
          break;
        case 'ArrowRight':
          onNext();
          break;
        case '+':
        case '=':
          setScale(prev => Math.min(prev + 0.25, 3));
          break;
        case '-':
          setScale(prev => Math.max(prev - 0.25, 0.5));
          break;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!isOpen) return;
      e.preventDefault();
      
      if (e.deltaY < 0) {
        setScale(prev => Math.min(prev + 0.1, 3));
      } else {
        setScale(prev => Math.max(prev - 0.1, 0.5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen, onClose, onPrev, onNext]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleRotateLeft = () => setRotation(prev => (prev - 90 + 360) % 360);
  const handleRotateRight = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    positionStart.current = { ...position };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;
    setPosition({
      x: positionStart.current.x + deltaX,
      y: positionStart.current.y + deltaY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  if (!isOpen || images.length === 0) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {/* Right Toolbar */}
          <div 
            className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 p-2 rounded-xl z-10"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors text-white hover:bg-red-500/50"
              title="关闭 (Esc)"
            >
              <X size={20} />
            </button>
            
            <div className="w-full h-px my-1" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            
            {/* Zoom Controls */}
            <button
              onClick={handleZoomIn}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors text-white hover:bg-white/20"
              title="放大 (+)"
            >
              <ZoomIn size={20} />
            </button>
            
            <div className="text-white text-xs py-1 text-center min-w-[40px]" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              {Math.round(scale * 100)}%
            </div>
            
            <button
              onClick={handleZoomOut}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors text-white hover:bg-white/20"
              title="缩小 (-)"
            >
              <ZoomOut size={20} />
            </button>
            
            <div className="w-full h-px my-1" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            
            {/* Rotate Controls */}
            <button
              onClick={handleRotateLeft}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors text-white hover:bg-white/20"
              title="向左旋转"
            >
              <RotateCcw size={20} />
            </button>
            
            <button
              onClick={handleRotateRight}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors text-white hover:bg-white/20"
              title="向右旋转"
            >
              <RotateCw size={20} />
            </button>
            
            <div className="w-full h-px my-1" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            
            {/* Reset */}
            <button
              onClick={handleReset}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors text-white hover:bg-white/20"
              title="重置"
            >
              <span className="text-xs font-medium">重置</span>
            </button>
            
            <div className="w-full h-px my-1" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            
            {/* Image Counter */}
            <div className="text-white text-xs font-medium py-2 px-3 text-center" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              {currentIndex + 1} / {images.length}
            </div>
            
            <div className="w-full h-px my-1" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            
            {/* Bottom Close Button */}
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors text-white hover:bg-red-500/50"
              title="关闭 (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full transition-colors text-white hover:bg-white/20 z-10"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                className="absolute right-20 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full transition-colors text-white hover:bg-white/20 z-10"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Image */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center w-full h-full overflow-hidden"
            style={{ paddingRight: '80px', paddingLeft: '16px' }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <img
              src={images[currentIndex]}
              alt={`图片 ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain transition-transform duration-75"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
              draggable={false}
            />
          </motion.div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div 
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 rounded-lg z-10"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => onJumpTo?.(idx)}
                  className={`relative h-12 w-12 rounded overflow-hidden transition-all ${
                    idx === currentIndex ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
