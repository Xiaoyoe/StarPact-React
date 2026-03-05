export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  const len = text.length;
  let chineseCount = 0;
  
  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x4e00 && code <= 0x9fa5) {
      chineseCount++;
    }
  }
  
  const nonChineseLen = len - chineseCount;
  return Math.ceil(chineseCount * 1.5 + nonChineseLen * 0.25);
}

export function estimateConversationTokens(messages: Array<{ content: string; images?: string[] }>): number {
  let totalTokens = 0;
  
  for (const msg of messages) {
    totalTokens += estimateTokens(msg.content);
    
    if (msg.images && msg.images.length > 0) {
      for (const img of msg.images) {
        const base64Match = img.match(/^data:image\/\w+;base64,(.+)$/);
        const base64Data = base64Match ? base64Match[1] : img;
        const sizeInKB = (base64Data.length * 0.75) / 1024;
        totalTokens += Math.ceil(sizeInKB * 4);
      }
    }
  }
  
  return totalTokens;
}

export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens} tokens`;
  } else if (tokens < 1000000) {
    return `${(tokens / 1000).toFixed(1)}K tokens`;
  } else {
    return `${(tokens / 1000000).toFixed(2)}M tokens`;
  }
}
