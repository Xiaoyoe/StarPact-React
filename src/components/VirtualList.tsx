import { useRef, useEffect, useState, useCallback, useMemo, memo, forwardRef, useImperativeHandle } from 'react';

interface VirtualListProps<T> {
  items: T[];
  estimatedItemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemHeight?: (item: T, index: number) => number;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface VirtualListRef {
  scrollToIndex: (index: number, behavior?: 'auto' | 'smooth') => void;
  scrollToBottom: (behavior?: 'auto' | 'smooth') => void;
  getScrollTop: () => number;
}

export const VirtualList = memo(forwardRef(<T,>(
  {
    items,
    estimatedItemHeight,
    containerHeight,
    renderItem,
    getItemHeight,
    overscan = 3,
    onScroll,
    className,
    style,
  }: VirtualListProps<T>,
  ref: React.Ref<VirtualListRef>
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const heightCacheRef = useRef<Map<number, number>>(new Map());
  const measuredRef = useRef<Set<number>>(new Set());

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
    if (getItemHeight) {
      return getItemHeight(items[index], index);
    }
    return estimatedItemHeight;
  }, [items, getItemHeight, estimatedItemHeight]);

  const itemOffsets = useMemo(() => {
    const offsets: number[] = [];
    let offset = 0;
    for (let i = 0; i < items.length; i++) {
      offsets.push(offset);
      offset += getItemHeightWithCache(i);
    }
    return offsets;
  }, [items.length, getItemHeightWithCache]);

  const totalHeight = useMemo(() => {
    if (itemOffsets.length === 0) return 0;
    const lastIndex = itemOffsets.length - 1;
    return itemOffsets[lastIndex] + getItemHeightWithCache(lastIndex);
  }, [itemOffsets, getItemHeightWithCache]);

  const visibleRange = useMemo(() => {
    if (items.length === 0) {
      return { startIndex: 0, endIndex: -1 };
    }

    let startIndex = 0;
    let endIndex = items.length - 1;

    const overscanHeight = overscan * estimatedItemHeight;

    for (let i = 0; i < itemOffsets.length; i++) {
      const itemHeight = getItemHeightWithCache(i);
      if (itemOffsets[i] + itemHeight > scrollTop - overscanHeight) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
    }

    for (let i = startIndex; i < itemOffsets.length; i++) {
      if (itemOffsets[i] > scrollTop + containerHeight + overscanHeight) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
    }

    return { startIndex, endIndex };
  }, [scrollTop, itemOffsets, containerHeight, items.length, overscan, estimatedItemHeight, getItemHeightWithCache]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  const scrollToIndex = useCallback((index: number, behavior: 'auto' | 'smooth' = 'smooth') => {
    if (containerRef.current && index >= 0 && index < items.length) {
      const targetOffset = itemOffsets[index] || 0;
      containerRef.current.scrollTo({
        top: targetOffset,
        behavior,
      });
    }
  }, [items.length, itemOffsets]);

  const scrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: totalHeight,
        behavior,
      });
    }
  }, [totalHeight]);

  const getScrollTop = useCallback(() => {
    return scrollTop;
  }, [scrollTop]);

  useImperativeHandle(ref, () => ({
    scrollToIndex,
    scrollToBottom,
    getScrollTop,
  }), [scrollToIndex, scrollToBottom, getScrollTop]);

  const visibleItems = useMemo(() => {
    const result: { item: T; index: number; offset: number }[] = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (i >= 0 && i < items.length) {
        result.push({
          item: items[i],
          index: i,
          offset: itemOffsets[i],
        });
      }
    }
    return result;
  }, [items, visibleRange, itemOffsets]);

  useEffect(() => {
    measuredRef.current.clear();
    heightCacheRef.current.clear();
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
        ...style,
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, offset }) => (
          <div
            key={index}
            ref={(el) => measureItemHeight(index, el)}
            style={{
              position: 'absolute',
              top: offset,
              left: 0,
              right: 0,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
})) as <T>(
  props: VirtualListProps<T> & { ref?: React.Ref<VirtualListRef> }
) => React.ReactElement;

export function useMessageListHeight<T extends { content: string; thinking?: string; images?: string[] }>(
  messages: T[],
  estimatedHeight: number = 120
) {
  const getMessageHeight = useCallback((message: T): number => {
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

    return Math.max(height, estimatedHeight);
  }, [estimatedHeight]);

  const getItemHeight = useCallback((message: T, _index: number): number => {
    return getMessageHeight(message);
  }, [getMessageHeight]);

  return { getItemHeight, getMessageHeight, estimatedHeight };
}
