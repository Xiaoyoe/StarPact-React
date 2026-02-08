// SequenceMatcher-like diff engine for character-level comparison

export interface DiffOp {
  type: 'equal' | 'insert' | 'delete' | 'replace';
  leftStart: number;
  leftEnd: number;
  rightStart: number;
  rightEnd: number;
}

export interface CharDiff {
  text: string;
  type: 'same' | 'different';
}

export interface LineDiff {
  lineNumber: number;
  type: number; // 0=same, 1=added, 2=modified, 3=left-only
}

export interface NumberDiff {
  index: number;
  leftNumber: string;
  rightNumber: string;
}

export interface StructureDiff {
  leftLines: number;
  rightLines: number;
  leftParagraphs: number;
  rightParagraphs: number;
  indentDiffs: { line: number; leftIndent: number; rightIndent: number }[];
}

export interface UnifiedDiffLine {
  type: 'header' | 'file-old' | 'file-new' | 'hunk' | 'add' | 'delete' | 'context';
  content: string;
  simplified?: string;
}

// Simple LCS-based sequence matcher
function longestCommonSubsequence(a: string, b: string): DiffOp[] {
  const m = a.length;
  const n = b.length;

  // For very large texts, use a simpler approach
  if (m * n > 10000000) {
    return simpleDiff(a, b);
  }

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find operations
  const ops: DiffOp[] = [];
  let i = m, j = n;

  const rawOps: { type: 'equal' | 'delete' | 'insert'; li: number; ri: number }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      rawOps.push({ type: 'equal', li: i - 1, ri: j - 1 });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawOps.push({ type: 'insert', li: i, ri: j - 1 });
      j--;
    } else {
      rawOps.push({ type: 'delete', li: i - 1, ri: j });
      i--;
    }
  }

  rawOps.reverse();

  // Merge consecutive same-type operations
  let k = 0;
  while (k < rawOps.length) {
    const op = rawOps[k];
    if (op.type === 'equal') {
      const start = k;
      while (k < rawOps.length && rawOps[k].type === 'equal') k++;
      ops.push({
        type: 'equal',
        leftStart: rawOps[start].li,
        leftEnd: rawOps[k - 1].li + 1,
        rightStart: rawOps[start].ri,
        rightEnd: rawOps[k - 1].ri + 1,
      });
    } else {
      // Collect consecutive non-equal ops
      const startK = k;
      let leftStart = op.type === 'delete' ? op.li : op.li;
      let leftEnd = leftStart;
      let rightStart = op.type === 'insert' ? op.ri : op.ri;
      let rightEnd = rightStart;
      let hasDelete = false;
      let hasInsert = false;

      while (k < rawOps.length && rawOps[k].type !== 'equal') {
        const curr = rawOps[k];
        if (curr.type === 'delete') {
          hasDelete = true;
          if (k === startK) leftStart = curr.li;
          leftEnd = curr.li + 1;
        } else {
          hasInsert = true;
          if (k === startK) rightStart = curr.ri;
          rightEnd = curr.ri + 1;
        }
        k++;
      }

      if (hasDelete && hasInsert) {
        ops.push({ type: 'replace', leftStart, leftEnd, rightStart, rightEnd });
      } else if (hasDelete) {
        ops.push({ type: 'delete', leftStart, leftEnd, rightStart, rightEnd: rightStart });
      } else {
        ops.push({ type: 'insert', leftStart: leftEnd, leftEnd, rightStart, rightEnd });
      }
    }
  }

  return ops;
}

function simpleDiff(a: string, b: string): DiffOp[] {
  // Line-based diff for large texts
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const ops: DiffOp[] = [];

  const maxLen = Math.max(aLines.length, bLines.length);
  let aPos = 0, bPos = 0;

  for (let i = 0; i < maxLen; i++) {
    const aLine = i < aLines.length ? aLines[i] : undefined;
    const bLine = i < bLines.length ? bLines[i] : undefined;
    const aLineLen = aLine !== undefined ? aLine.length + (i < aLines.length - 1 ? 1 : 0) : 0;
    const bLineLen = bLine !== undefined ? bLine.length + (i < bLines.length - 1 ? 1 : 0) : 0;

    if (aLine === bLine) {
      ops.push({ type: 'equal', leftStart: aPos, leftEnd: aPos + aLineLen, rightStart: bPos, rightEnd: bPos + bLineLen });
    } else if (aLine !== undefined && bLine !== undefined) {
      ops.push({ type: 'replace', leftStart: aPos, leftEnd: aPos + aLineLen, rightStart: bPos, rightEnd: bPos + bLineLen });
    } else if (aLine === undefined) {
      ops.push({ type: 'insert', leftStart: aPos, leftEnd: aPos, rightStart: bPos, rightEnd: bPos + bLineLen });
    } else {
      ops.push({ type: 'delete', leftStart: aPos, leftEnd: aPos + aLineLen, rightStart: bPos, rightEnd: bPos });
    }

    aPos += aLineLen;
    bPos += bLineLen;
  }

  return ops;
}

// Get character-level diffs for highlighting
export function getCharDiffs(left: string, right: string): { leftDiffs: CharDiff[]; rightDiffs: CharDiff[] } {
  if (!left && !right) return { leftDiffs: [], rightDiffs: [] };

  const ops = longestCommonSubsequence(left, right);
  const leftDiffs: CharDiff[] = [];
  const rightDiffs: CharDiff[] = [];

  for (const op of ops) {
    if (op.type === 'equal') {
      leftDiffs.push({ text: left.slice(op.leftStart, op.leftEnd), type: 'same' });
      rightDiffs.push({ text: right.slice(op.rightStart, op.rightEnd), type: 'same' });
    } else if (op.type === 'replace') {
      leftDiffs.push({ text: left.slice(op.leftStart, op.leftEnd), type: 'different' });
      rightDiffs.push({ text: right.slice(op.rightStart, op.rightEnd), type: 'different' });
    } else if (op.type === 'delete') {
      leftDiffs.push({ text: left.slice(op.leftStart, op.leftEnd), type: 'different' });
    } else if (op.type === 'insert') {
      rightDiffs.push({ text: right.slice(op.rightStart, op.rightEnd), type: 'different' });
    }
  }

  return { leftDiffs, rightDiffs };
}

// Line-level diff analysis
export function getLineDiffs(left: string, right: string): LineDiff[] {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const diffs: LineDiff[] = [];
  const maxLen = Math.max(leftLines.length, rightLines.length);

  for (let i = 0; i < maxLen; i++) {
    if (i >= leftLines.length) {
      diffs.push({ lineNumber: i + 1, type: 1 }); // added
    } else if (i >= rightLines.length) {
      diffs.push({ lineNumber: i + 1, type: 3 }); // left only
    } else if (leftLines[i] === rightLines[i]) {
      diffs.push({ lineNumber: i + 1, type: 0 }); // same
    } else {
      diffs.push({ lineNumber: i + 1, type: 2 }); // modified
    }
  }

  return diffs;
}

// Number extraction and comparison
export function getNumberDiffs(left: string, right: string): NumberDiff[] {
  const leftNumbers = (left.match(/\d+\.?\d*/g) || []);
  const rightNumbers = (right.match(/\d+\.?\d*/g) || []);
  const diffs: NumberDiff[] = [];
  const maxLen = Math.max(leftNumbers.length, rightNumbers.length);

  for (let i = 0; i < maxLen; i++) {
    const ln = i < leftNumbers.length ? leftNumbers[i] : '(无)';
    const rn = i < rightNumbers.length ? rightNumbers[i] : '(无)';
    if (ln !== rn) {
      diffs.push({ index: i, leftNumber: ln, rightNumber: rn });
    }
  }

  return diffs;
}

// Structure comparison
export function getStructureDiff(left: string, right: string): StructureDiff {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');

  // Count paragraphs (separated by empty lines)
  const countParagraphs = (lines: string[]) => {
    let count = 0;
    let inParagraph = false;
    for (const line of lines) {
      if (line.trim().length > 0) {
        if (!inParagraph) {
          count++;
          inParagraph = true;
        }
      } else {
        inParagraph = false;
      }
    }
    return count;
  };

  const indentDiffs: StructureDiff['indentDiffs'] = [];
  const maxLen = Math.max(leftLines.length, rightLines.length);
  for (let i = 0; i < maxLen; i++) {
    const leftIndent = i < leftLines.length ? (leftLines[i].match(/^(\s*)/)?.[1].length || 0) : 0;
    const rightIndent = i < rightLines.length ? (rightLines[i].match(/^(\s*)/)?.[1].length || 0) : 0;
    if (leftIndent !== rightIndent) {
      indentDiffs.push({ line: i + 1, leftIndent, rightIndent });
    }
  }

  return {
    leftLines: leftLines.length,
    rightLines: rightLines.length,
    leftParagraphs: countParagraphs(leftLines),
    rightParagraphs: countParagraphs(rightLines),
    indentDiffs,
  };
}

// Generate unified diff (Git-style)
export function generateUnifiedDiff(left: string, right: string): UnifiedDiffLine[] {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const result: UnifiedDiffLine[] = [];

  // File headers
  result.push({ type: 'file-old', content: '--- 原始文本' });
  result.push({ type: 'file-new', content: '+++ 修改后文本' });

  // Simple line-by-line diff using LCS on lines
  const m = leftLines.length;
  const n = rightLines.length;

  // LCS for lines
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  interface RawLineDiff {
    type: 'context' | 'delete' | 'add';
    content: string;
    leftLine?: number;
    rightLine?: number;
  }

  const rawDiffs: RawLineDiff[] = [];
  let i = m, j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      rawDiffs.push({ type: 'context', content: ' ' + leftLines[i - 1], leftLine: i, rightLine: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiffs.push({ type: 'add', content: '+' + rightLines[j - 1], rightLine: j });
      j--;
    } else {
      rawDiffs.push({ type: 'delete', content: '-' + leftLines[i - 1], leftLine: i });
      i--;
    }
  }

  rawDiffs.reverse();

  // Group into hunks
  const CONTEXT_LINES = 3;
  const hunks: RawLineDiff[][] = [];
  let currentHunk: RawLineDiff[] = [];
  let lastChangeIdx = -100;

  for (let idx = 0; idx < rawDiffs.length; idx++) {
    const d = rawDiffs[idx];
    if (d.type !== 'context') {
      if (idx - lastChangeIdx > CONTEXT_LINES * 2 + 1 && currentHunk.length > 0) {
        hunks.push(currentHunk);
        currentHunk = [];
        // Add leading context
        for (let c = Math.max(0, idx - CONTEXT_LINES); c < idx; c++) {
          currentHunk.push(rawDiffs[c]);
        }
      } else {
        // Fill context gap
        for (let c = lastChangeIdx + 1; c < idx; c++) {
          // Check if this index is already in currentHunk
          const alreadyInHunk = currentHunk.some((_, i) => {
            const hunkIdx = idx - currentHunk.length + i;
            return hunkIdx === c;
          });
          if (!alreadyInHunk) {
            currentHunk.push(rawDiffs[c]);
          }
        }
      }
      currentHunk.push(d);
      lastChangeIdx = idx;
    } else if (currentHunk.length > 0 && idx - lastChangeIdx <= CONTEXT_LINES) {
      currentHunk.push(d);
    } else if (currentHunk.length === 0 && idx >= rawDiffs.length - 1) {
      // skip trailing context with no changes
    }
  }

  if (currentHunk.length > 0) {
    hunks.push(currentHunk);
  }

  // If no hunks but there are diffs, just output everything
  if (hunks.length === 0 && rawDiffs.length > 0) {
    // Check if there are any changes
    const hasChanges = rawDiffs.some(d => d.type !== 'context');
    if (!hasChanges) {
      result.push({ type: 'context', content: '(文本完全相同，无差异)' });
      return result;
    }
  }

  for (const hunk of hunks) {
    if (!hunk || hunk.length === 0) continue;
    
    // Calculate hunk header
    let leftStart = Infinity, leftCount = 0;
    let rightStart = Infinity, rightCount = 0;

    for (const d of hunk) {
      if (!d) continue;
      if (d.type === 'context' || d.type === 'delete') {
        if (d.leftLine !== undefined) {
          leftStart = Math.min(leftStart, d.leftLine);
          leftCount++;
        }
      }
      if (d.type === 'context' || d.type === 'add') {
        if (d.rightLine !== undefined) {
          rightStart = Math.min(rightStart, d.rightLine);
          rightCount++;
        }
      }
    }

    if (leftStart === Infinity) leftStart = 1;
    if (rightStart === Infinity) rightStart = 1;

    const hunkHeader = `@@ -${leftStart},${leftCount} +${rightStart},${rightCount} @@`;
    const simplified = `原始文本: 第${leftStart}-${leftStart + leftCount - 1}行 | 修改后文本: 第${rightStart}-${rightStart + rightCount - 1}行`;

    result.push({ type: 'hunk', content: hunkHeader, simplified });

    for (const d of hunk) {
      if (!d) continue;
      result.push({ type: d.type as 'add' | 'delete' | 'context', content: d.content });
    }
  }

  return result;
}

// Extract FROM content for smart naming
export function extractFromContent(text: string): string | null {
  const match = text.match(/FROM\s+(.+?)(?:\n|$)/i);
  return match ? match[1].trim() : null;
}

// Generate timestamp string
export function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

// Validate save name (only English, numbers, underscore)
export function isValidSaveName(name: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(name);
}
