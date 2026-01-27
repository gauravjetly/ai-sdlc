/**
 * Token Counter Utility
 *
 * Estimates token count for context management.
 * Uses simple approximation: ~4 characters per token
 */

export class TokenCounter {
  private static readonly CHARS_PER_TOKEN = 4;

  /**
   * Estimate tokens in text
   */
  static count(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Count tokens in multiple texts
   */
  static countMultiple(texts: string[]): number {
    return texts.reduce((total, text) => total + this.count(text), 0);
  }

  /**
   * Count tokens in object (JSON stringified)
   */
  static countObject(obj: any): number {
    return this.count(JSON.stringify(obj, null, 2));
  }

  /**
   * Truncate text to fit token budget
   */
  static truncate(text: string, maxTokens: number): string {
    const maxChars = maxTokens * this.CHARS_PER_TOKEN;
    if (text.length <= maxChars) return text;

    return text.substring(0, maxChars - 3) + '...';
  }

  /**
   * Smart truncate - tries to break at sentence boundary
   */
  static smartTruncate(text: string, maxTokens: number): string {
    const maxChars = maxTokens * this.CHARS_PER_TOKEN;
    if (text.length <= maxChars) return text;

    const truncated = text.substring(0, maxChars);
    const lastSentence = truncated.lastIndexOf('.');

    if (lastSentence > maxChars * 0.7) {
      return truncated.substring(0, lastSentence + 1);
    }

    return truncated.substring(0, maxChars - 3) + '...';
  }
}
