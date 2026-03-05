export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const numbers = (text.match(/\d+/g) || []).length;
  const punctuation = (text.match(/[^\w\s\u4e00-\u9fa5]/g) || []).length;
  const whitespace = (text.match(/\s+/g) || []).length;
  
  const chineseTokens = Math.ceil(chineseChars * 1.5);
  const englishTokens = Math.ceil(englishWords * 1.3);
  const numberTokens = Math.ceil(numbers * 0.5);
  const punctuationTokens = Math.ceil(punctuation * 0.5);
  const whitespaceTokens = Math.ceil(whitespace * 0.3);
  
  return chineseTokens + englishTokens + numberTokens + punctuationTokens + whitespaceTokens;
}

export function estimateConversationTokens(messages: Array<{ content: string; images?: string[] }>): number {
  let totalTokens = 0;
  
  for (const msg of messages) {
    totalTokens += estimateTokens(msg.content);
    
    if (msg.images && msg.images.length > 0) {
      for (const img of msg.images) {
        const base64Match = img.match(/^data:image\/\w+;base64,(.+)$/);
        const base64Data = base64Match ? base64Match[1] : img;
        const sizeInBytes = Math.ceil(base64Data.length * 0.75);
        const sizeInKB = sizeInBytes / 1024;
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
