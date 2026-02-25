import { useState, useCallback } from 'react';
import {
  getCharDiffs,
  generateUnifiedDiff,
  type CharDiff,
  type UnifiedDiffLine,
} from '@/utils/diffEngine';

export interface CompareStats {
  addedLines: number;
  deletedLines: number;
  modifiedLines: number;
  sameLines: number;
  addedChars: number;
  deletedChars: number;
}

export interface CompareState {
  leftText: string;
  rightText: string;
  leftDiffs: CharDiff[] | null;
  rightDiffs: CharDiff[] | null;
  diffLines: UnifiedDiffLine[];
  viewMode: 'editor' | 'diff';
  diffReady: boolean;
  fontSize: number;
  leftWidth: number;
  stats: CompareStats | null;
}

export interface CompareActions {
  setLeftText: (text: string) => void;
  setRightText: (text: string) => void;
  handleCompare: () => void;
  handleClear: () => void;
  handleClearStyles: () => void;
  handleToggleView: () => void;
  handleFontIncrease: () => void;
  handleFontDecrease: () => void;
  handleFontReset: () => void;
  handleSplitterDrag: (dx: number, containerWidth: number) => void;
}

function calculateStats(diffLines: UnifiedDiffLine[]): CompareStats {
  let addedLines = 0;
  let deletedLines = 0;
  let sameLines = 0;
  let addedChars = 0;
  let deletedChars = 0;

  for (const line of diffLines) {
    if (line.type === 'add') {
      addedLines++;
      addedChars += line.content.length - 1;
    } else if (line.type === 'delete') {
      deletedLines++;
      deletedChars += line.content.length - 1;
    } else if (line.type === 'context') {
      sameLines++;
    }
  }

  return {
    addedLines,
    deletedLines,
    modifiedLines: 0,
    sameLines,
    addedChars,
    deletedChars,
  };
}

export function useCompareState(): [CompareState, CompareActions] {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [leftDiffs, setLeftDiffs] = useState<CharDiff[] | null>(null);
  const [rightDiffs, setRightDiffs] = useState<CharDiff[] | null>(null);
  const [diffLines, setDiffLines] = useState<UnifiedDiffLine[]>([]);
  const [viewMode, setViewMode] = useState<'editor' | 'diff'>('editor');
  const [diffReady, setDiffReady] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [leftWidth, setLeftWidth] = useState(50);
  const [stats, setStats] = useState<CompareStats | null>(null);

  const handleCompare = useCallback(() => {
    const { leftDiffs: ld, rightDiffs: rd } = getCharDiffs(leftText, rightText);
    setLeftDiffs(ld);
    setRightDiffs(rd);

    const unified = generateUnifiedDiff(leftText, rightText);
    setDiffLines(unified);
    setStats(calculateStats(unified));

    setDiffReady(true);
    setViewMode('diff');
  }, [leftText, rightText]);

  const handleClear = useCallback(() => {
    setLeftText('');
    setRightText('');
    setLeftDiffs(null);
    setRightDiffs(null);
    setDiffLines([]);
    setDiffReady(false);
    setViewMode('editor');
    setLeftWidth(50);
    setStats(null);
  }, []);

  const handleClearStyles = useCallback(() => {
    setLeftDiffs(null);
    setRightDiffs(null);
  }, []);

  const handleToggleView = useCallback(() => {
    setViewMode(prev => prev === 'editor' ? 'diff' : 'editor');
  }, []);

  const handleFontIncrease = useCallback(() => {
    setFontSize(prev => Math.min(prev + 2, 18));
  }, []);

  const handleFontDecrease = useCallback(() => {
    setFontSize(prev => Math.max(prev - 2, 6));
  }, []);

  const handleFontReset = useCallback(() => {
    setFontSize(13);
  }, []);

  const handleSplitterDrag = useCallback((dx: number, containerWidth: number) => {
    const pctChange = (dx / containerWidth) * 100;
    setLeftWidth(prev => Math.max(20, Math.min(80, prev + pctChange)));
  }, []);

  const state: CompareState = {
    leftText,
    rightText,
    leftDiffs,
    rightDiffs,
    diffLines,
    viewMode,
    diffReady,
    fontSize,
    leftWidth,
    stats,
  };

  const actions: CompareActions = {
    setLeftText,
    setRightText,
    handleCompare,
    handleClear,
    handleClearStyles,
    handleToggleView,
    handleFontIncrease,
    handleFontDecrease,
    handleFontReset,
    handleSplitterDrag,
  };

  return [state, actions];
}
