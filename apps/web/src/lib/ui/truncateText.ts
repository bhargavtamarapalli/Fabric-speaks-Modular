import type { CSSProperties } from "react";

/**
 * Utility function to create truncated text styles
 * Prevents text overflow in table cells and list items
 */
export function truncateTextStyles(lines: number = 1) {
  if (lines === 1) {
    return {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    } as const;
  }

  // Multi-line truncation (webkit browsers)
  return {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as CSSProperties;
}

/**
 * Add title hover tooltip to a span element for truncated text
 * Usage: Show full text on hover when truncated
 */
export function withTruncateTooltip(text: string, maxLength: number = 50) {
  return text?.length > maxLength ? text : undefined;
}
