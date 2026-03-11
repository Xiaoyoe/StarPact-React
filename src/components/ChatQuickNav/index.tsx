import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { ChatMessage } from '@/store';
import { cn } from '@/utils/cn';
import styles from './styles.module.css';

interface NavPoint {
  id: string;
  messageId: string;
  content: string;
  timestamp: number;
}

interface ChatQuickNavProps {
  messages: ChatMessage[];
}

export function ChatQuickNav({ messages }: ChatQuickNavProps) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const [lastVisibleIndex, setLastVisibleIndex] = useState<number>(-1);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pointRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const navPoints = useMemo<NavPoint[]>(() => {
    return messages
      .filter(msg => msg.role === 'user')
      .map(msg => ({
        id: msg.id,
        messageId: msg.id,
        content: msg.content,
        timestamp: msg.timestamp,
      }));
  }, [messages]);

  const truncateText = useCallback((text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }, []);

  const scrollToMessage = useCallback((messageId: string) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const scrollToTop = useCallback(() => {
    if (messages.length > 0) {
      const firstMessage = document.querySelector(`[data-message-id="${messages[0].id}"]`);
      if (firstMessage) {
        firstMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      const lastMessage = document.querySelector(`[data-message-id="${messages[messages.length - 1].id}"]`);
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || navPoints.length === 0) return;

    const visiblePoints = new Set<string>();
    let lastVisibleIdx = -1;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-nav-point-id');
          if (id) {
            if (entry.isIntersecting) {
              visiblePoints.add(id);
            } else {
              visiblePoints.delete(id);
            }
          }
        });

        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }

        rafRef.current = requestAnimationFrame(() => {
          let newLastVisibleIdx = -1;
          navPoints.forEach((point, index) => {
            if (visiblePoints.has(point.id)) {
              newLastVisibleIdx = index;
            }
          });

          if (newLastVisibleIdx !== lastVisibleIdx) {
            lastVisibleIdx = newLastVisibleIdx;
            setLastVisibleIndex(newLastVisibleIdx);
          }
        });
      },
      {
        root: container,
        threshold: 0.5,
      }
    );

    pointRefsRef.current.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [navPoints]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const { scrollTop, scrollHeight, clientHeight } = container;
          const isBottom = scrollTop + clientHeight >= scrollHeight - 5;
          setIsAtBottom(isBottom);
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const pointStatus = useMemo(() => {
    return navPoints.map((_, index) => {
      if (isAtBottom && index === navPoints.length - 1) {
        return 'bottom';
      }
      if (index === lastVisibleIndex && lastVisibleIndex < navPoints.length - 1) {
        return 'more';
      }
      return 'normal';
    });
  }, [navPoints, lastVisibleIndex, isAtBottom]);

  const registerPointRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      pointRefsRef.current.set(id, el);
    } else {
      pointRefsRef.current.delete(id);
    }
  }, []);

  return (
    <div className={styles.container}>
      <button
        onClick={scrollToTop}
        className={styles.navButton}
        title="跳转到顶部"
      >
        <ChevronUp size={16} />
      </button>

      <div className={styles.navPointsContainer} ref={containerRef}>
        {navPoints.map((point, index) => {
          const status = pointStatus[index];
          return (
            <div
              key={point.id}
              ref={registerPointRef(point.id)}
              data-nav-point
              data-nav-point-id={point.id}
              className={cn(
                styles.navPoint,
                hoveredPoint === point.id && styles.navPointHovered,
                status === 'more' && styles.navPointHasMore,
                status === 'bottom' && styles.navPointAtBottom
              )}
              onClick={() => scrollToMessage(point.messageId)}
              onMouseEnter={() => setHoveredPoint(point.id)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <div className={styles.navPointIndicator} />
              <div className={styles.navPointTooltip}>
                #{index + 1} {truncateText(point.content)}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={scrollToBottom}
        className={styles.navButton}
        title="跳转到底部"
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
}
