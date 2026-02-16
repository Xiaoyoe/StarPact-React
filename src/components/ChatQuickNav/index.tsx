import { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '@/store';
import { cn } from '@/utils/cn';
import styles from './styles.module.css';

interface ChatQuickNavProps {
  messages: ChatMessage[];
}

interface NavPoint {
  id: string;
  messageId: string;
  content: string;
  timestamp: number;
}

interface ChatQuickNavProps {
  messages: ChatMessage[];
  onHoverMessage?: (content: string | null) => void;
}

export function ChatQuickNav({ messages, onHoverMessage }: ChatQuickNavProps) {
  const [navPoints, setNavPoints] = useState<NavPoint[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  // 过滤用户消息作为导航点
  useEffect(() => {
    const userMessages = messages
      .filter(msg => msg.role === 'user')
      .map(msg => ({
        id: msg.id,
        messageId: msg.id,
        content: msg.content,
        timestamp: msg.timestamp,
      }));
    setNavPoints(userMessages);
  }, [messages]);

  // 滚动到指定消息
  const scrollToMessage = (messageId: string) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 滚动到顶部
  const scrollToTop = () => {
    if (messages.length > 0) {
      const firstMessage = document.querySelector(`[data-message-id="${messages[0].id}"]`);
      if (firstMessage) {
        firstMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // 滚动到底部
  const scrollToBottom = () => {
    if (messages.length > 0) {
      const lastMessage = document.querySelector(`[data-message-id="${messages[messages.length - 1].id}"]`);
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  };

  // 限制文本长度
  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className={styles.container}>
      {/* 顶部导航按钮 */}
      <button
        onClick={scrollToTop}
        className={styles.navButton}
        title="跳转到第一条消息"
      >
        <ChevronUp size={16} />
      </button>

      {/* 导航点列表 */}
      <div className={styles.navPointsContainer}>
        {navPoints.map((point) => (
          <div
            key={point.id}
            className={cn(styles.navPoint, hoveredPoint === point.id && styles.navPointHovered)}
            onClick={() => scrollToMessage(point.messageId)}
            onMouseEnter={() => {
              setHoveredPoint(point.id);
              if (onHoverMessage) {
                onHoverMessage(truncateText(point.content));
              }
            }}
            onMouseLeave={() => {
              setHoveredPoint(null);
              if (onHoverMessage) {
                onHoverMessage(null);
              }
            }}
            title={truncateText(point.content)}
          >
            <div className={styles.navPointIndicator} />
          </div>
        ))}
      </div>

      {/* 底部导航按钮 */}
      <button
        onClick={scrollToBottom}
        className={styles.navButton}
        title="跳转到最新消息"
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
}
