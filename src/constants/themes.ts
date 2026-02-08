import type { ThemeType } from '@/store';

export const THEMES: { id: ThemeType; name: string; description: string; colors: string[] }[] = [
  {
    id: 'light',
    name: '浅色主题',
    description: '经典明亮风格',
    colors: ['#FFFFFF', '#165DFF', '#F2F3F5'],
  },
  {
    id: 'dark',
    name: '深色主题',
    description: '护眼暗色风格',
    colors: ['#17171A', '#3C7EFF', '#232324'],
  },
  {
    id: 'tech-blue',
    name: '科技蓝',
    description: '专业科技风格',
    colors: ['#FFFFFF', '#0A49C1', '#F8FBFF'],
  },
  {
    id: 'eye-care',
    name: '护眼绿',
    description: '自然舒适风格',
    colors: ['#FCFFFE', '#2A9D8F', '#F2FAF8'],
  },
] as const;

export const DEFAULT_THEME: ThemeType = 'light';
