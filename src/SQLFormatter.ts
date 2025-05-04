/**
 * sqlFormatter module
 * Provides document formatting logic for T-SQL,
 * including keyword casing, handling quoted segments (single, double,
 * braced and bracket literals), and applying newline & indentation rules.
 */

import { TextEdit, Range, Position } from 'vscode';
import { sqlKeywords, to_indent, new_line } from './WordList';

export function formatDocument(
  text: string,
  uppercase: boolean = true,
  indentSize: number = 2
): TextEdit[] {
  // 1. Split entire text into segments: quoted/braced/bracket literals or unquoted text
  const segments = text.split(
    /('(?:[^']|'')*'|"(?:[^"]|"")*"|\{(?:[^{}]|{})*\}|\[(?:[^\[\]]|\[\])*\])/gs
  );

  let indentLevel = 0;
  let formatted = '';

  // 2. Process each segment
  segments.forEach(segment => {
    // a) Quoted/braced/bracket literal: preserve inner words quoted
    if (
      (segment.startsWith("'") && segment.endsWith("'")) ||
      (segment.startsWith('"') && segment.endsWith('"')) ||
      (segment.startsWith('{') && segment.endsWith('}')) ||
      (segment.startsWith('[') && segment.endsWith(']'))
    ) {
      const quoteChar = segment[0];
      const inner = segment.slice(1, -1);
      formatted += inner
        .split(/\s+/)
        .map(w => `${quoteChar}${w}${quoteChar}`)
        .join(' ');
      return;
    }

    // b) Unquoted segment: split into tokens by whitespace or punctuation
    const tokens = segment.split(/(\s+|[^\w])/g).filter(Boolean);
    tokens.forEach(token => {
      const upper = uppercase ? token.toUpperCase() : token;

      // New line before certain tokens
      if (new_line.includes(upper.trim())) {
        formatted = formatted.trimEnd() + '\n' + ' '.repeat(indentLevel * indentSize);
      }

      formatted += upper;

      // Increase indent after certain tokens
      if (to_indent.includes(upper.trim())) {
        indentLevel++;
      }

      // Decrease indent on END
      if (upper.trim() === 'END') {
        indentLevel = Math.max(0, indentLevel - 1);
        formatted = formatted.trimEnd() + '\n' + ' '.repeat(indentLevel * indentSize);
      }
    });
  });

  // Compute full document range
  const lines = text.split(/\r?\n/);
  const lastLine = lines.length - 1;
  const lastChar = lines[lastLine].length;

  return [
    TextEdit.replace(
      new Range(new Position(0, 0), new Position(lastLine, lastChar)),
      formatted
    )
  ];
}
