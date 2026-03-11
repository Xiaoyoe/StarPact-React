import { useRef, useEffect, useState, useCallback, useMemo, memo, forwardRef, useImperativeHandle } from 'react';
import type { ChatMessage } from '@/store';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: ChatMessage[];
  compactMode: boolean;
  onImageClick: (images: string[], index: number) => void;
  onRegenerate?: (content: string, images?: string[]) => void;
  onDelete?: (messageId: string) => void;
  streamingContent?: string;
  streamingThinking?: string;
  containerHeight?: number | string;
  className?: string;
}

export interface MessageListRef {
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  getScrollTop: () => number;
}

const ESTIMATED_ITEM_HEIGHT = 120;
const OVERSCAN = 5;

const getMessageHeight = (message: ChatMessage): number => {
  const contentLength = message.content?.length || 0;
  const thinkingLength = message.thinking?.length || 0;
  const imageCount = message.images?.length || 0;

  let height = 80;

  const contentLines = Math.ceil(contentLength / 80);
  height += contentLines * 24;

  if (thinkingLength > 0) {
    height += 60;
    const thinkingLines = Math.ceil(thinkingLength / 80);
    height += thinkingLines * 20;
  }

  if (imageCount > 0) {
    height += 220;
  }

  return Math.max(height, ESTIMATED_ITEM_HEIGHT);
};

export const MessageList = memo(forwardRef<MessageListRef, MessageListProps>(function MessageList({
  messages,
  compactMode,
  onImageClick,
  onRegenerate,
  onDelete,
  streamingContent,
  streamingThinking,
  containerHeight = '100%',
  className,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [actualHeight, setActualHeight] = useState(600);
  const heightCacheRef = useRef<Map<number, number>>(new Map());
  const measuredRef = useRef<Set<number>>(new Set());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setActualHeight(entry.contentRect.height);
        }
      });
      resizeObserverRef.current.observe(containerRef.current);
    }

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, []);

  const measureItemHeight = useCallback((index: number, element: HTMLElement | null) => {
    if (element && !measuredRef.current.has(index)) {
      const height = element.getBoundingClientRect().height;
      heightCacheRef.current.set(index, height);
      measuredRef.current.add(index);
    }
  }, []);

  const getItemHeightWithCache = useCallback((index: number): number => {
    if (heightCacheRef.current.has(index)) {
      return heightCacheRef.current.get(index)!;
    }
    return getMessageHeight(messages[index]);
  }, [messages]);

  const itemOffsets = useMemo(() => {
    const offsets: number[] = [];
    let offset = 0;
    for (let i = 0; i < messages.length; i++) {
      offsets.push(offset);
      offset += getItemHeightWithCache(i);
    }
    return offsets;
  }, [messages.length, getItemHeightWithCache]);

  const totalHeight = useMemo(() => {
    if (itemOffsets.length === 0) return 0;
    const lastIndex = itemOffsets.length - 1;
    return itemOffsets[lastIndex] + getItemHeightWithCache(lastIndex);
  }, [itemOffsets, getItemHeightWithCache]);

  const visibleRange = useMemo(() => {
    if (messages.length === 0) {
      return { startIndex: 0, endIndex: -1 };
    }

    let startIndex = 0;
    let endIndex = messages.length - 1;

    const overscanHeight = OVERSCAN * ESTIMATED_ITEM_HEIGHT;

    for (let i = 0; i < itemOffsets.length; i++) {
      const itemHeight = getItemHeightWithCache(i);
      if (itemOffsets[i] + itemHeight > scrollTop - overscanHeight) {
        startIndex = Math.max(0, i - OVERSCAN);
        break;
      }
    }

    for (let i = startIndex; i < itemOffsets.length; i++) {
      if (itemOffsets[i] > scrollTop + actualHeight + overscanHeight) {
        endIndex = Math.min(messages.length - 1, i + OVERSCAN);
        break;
      }
    }

    return { startIndex, endIndex };
  }, [scrollTop, itemOffsets, actualHeight, messages.length, getItemHeightWithCache]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: totalHeight,
        behavior,
      });
    }
  }, [totalHeight]);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'auto') => {
    if (containerRef.current && index >= 0 && index < messages.length) {
      const targetOffset = itemOffsets[index] || 0;
      containerRef.current.scrollTo({
        top: targetOffset,
        behavior,
      });
    }
  }, [messages.length, itemOffsets]);

  const getScrollTop = useCallback(() => {
    return scrollTop;
  }, [scrollTop]);

  useImperativeHandle(ref, () => ({
    scrollToIndex,
    scrollToBottom,
    getScrollTop,
  }), [scrollToIndex, scrollToBottom, getScrollTop]);

  const visibleItems = useMemo(() => {
    const result: { message: ChatMessage; index: number; offset: number }[] = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (i >= 0 && i < messages.length) {
        result.push({
          message: messages[i],
          index: i,
          offset: itemOffsets[i],
        });
      }
    }
    return result;
  }, [messages, visibleRange, itemOffsets]);

  useEffect(() => {
    measuredRef.current.clear();
    heightCacheRef.current.clear();
  }, [messages.length]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ message, index, offset }) => (
          <div
            key={message.id}
            ref={(el) => measureItemHeight(index, el)}
            style={{
              position: 'absolute',
              top: offset,
              left: 0,
              right: 0,
            }}
          >
            <MessageBubble
              message={message}
              isLast={index === messages.length - 1}
              compactMode={compactMode}
              onImageClick={onImageClick}
              onRegenerate={onRegenerate}
              onDelete={onDelete}
              streamingContent={message.isStreaming && index === messages.length - 1 ? streamingContent : undefined}
              streamingThinking={message.isStreaming && index === messages.length - 1 ? streamingThinking : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}));
