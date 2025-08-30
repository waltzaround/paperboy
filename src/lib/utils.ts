import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTextWithBold(text: string): string {
  if (!text) return '';
  
  // Replace **text** with <strong>text</strong>
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

export function splitIntoParagraphs(text: string, maxLength: number = 400): string[] {
  if (!text) return [];
  
  // If text is shorter than maxLength, return as single paragraph
  if (text.length <= maxLength) {
    return [text];
  }
  
  const paragraphs: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentParagraph = '';
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed maxLength and we have content, start new paragraph
    if (currentParagraph.length + sentence.length > maxLength && currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.trim());
      currentParagraph = sentence;
    } else {
      currentParagraph += (currentParagraph ? ' ' : '') + sentence;
    }
  }
  
  // Add the last paragraph if it has content
  if (currentParagraph.trim()) {
    paragraphs.push(currentParagraph.trim());
  }
  
  return paragraphs;
}
