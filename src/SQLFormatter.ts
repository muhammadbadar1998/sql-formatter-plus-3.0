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
  // Split text into segments: literals or unquoted text
  const segments = text.split(/('(?:[^']|'')*'|"(?:[^"]|"")*"|\{(?:[^{}]|{})*\}|\[[^\[\]]*\])/gs);

  let indentLevel = 0;
  let formatted = '';

  for (const segment of segments) {
    const trimmed = segment.trim();
    // Literal segments: append verbatim
    if (
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      formatted += segment;
      continue;
    }

    // Unquoted: split only on whitespace to keep punctuation intact
    const parts = segment.split(/(\s+)/g).filter(Boolean);
    for (const part of parts) {
      const word = uppercase ? part.toUpperCase() : part;

      if (new_line.includes(word.trim())) {
        formatted = formatted.trimEnd() + '\n' + ' '.repeat(indentLevel * indentSize);
      }

      formatted += word;

      if (to_indent.includes(word.trim())) {
        indentLevel++;
      }

      if (word.trim() === 'END') {
        indentLevel = Math.max(0, indentLevel - 1);
        formatted = formatted.trimEnd() + '\n' + ' '.repeat(indentLevel * indentSize);
      }
    }
  }

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
