// src/sqlFormatter.ts

/**
 * sqlFormatter module
 * Provides document formatting logic for T-SQL,
 * including keyword casing and handling quoted segments (single, double,
 * and multi-line literals) across the entire document.
 */

import { TextEdit, Range, Position } from 'vscode';
import { sqlKeywords } from './WordList';

/**
 * Format the given SQL text, uppercasing keywords, splitting quoted strings
 * into individually quoted words, and preserving quoted literals even if
 * they span multiple lines.
 *
 * This operates on the entire document as a single string, then issues
 * a single TextEdit replacing the full range.
 *
 * @param text - the entire SQL document or selection text
 * @param uppercase - whether to uppercase SQL keywords (default: true)
 * @param indentSize - number of spaces per indent level (currently unused)
 * @returns an array with one TextEdit describing the full-document replacement
 */
export function formatDocument(
  text: string,
  uppercase: boolean = true,
  indentSize: number = 2
): TextEdit[] {
  // 1. Split entire text into segments: quoted literals or unquoted text
  //    Supports single or double quotes, including multi-line (using 's' flag)
  const segments = text.split(/('(?:[^']|'')*'|"(?:[^"]|"")*")/gs);

  // 2. Process each segment
  const processed = segments.map(segment => {
    // a) Quoted literal (single or double)
    if (
      (segment.startsWith("'") && segment.endsWith("'")) ||
      (segment.startsWith('"') && segment.endsWith('"'))
    ) {
      const quoteChar = segment[0];
      const inner = segment.slice(1, -1);
      // Split into words by whitespace, re-wrap each word individually
      return inner
        .split(/\s+/)
        .map(w => `${quoteChar}${w}${quoteChar}`)
        .join(' ');
    }

    // b) Unquoted segment: apply keyword casing
    let out = segment;
    sqlKeywords.forEach(kw => {
      const re = new RegExp(`\\b${kw}\\b`, 'gi');
      out = out.replace(re, uppercase ? kw : kw.toLowerCase());
    });
    return out;
  });

  // 3. Reassemble the full formatted text
  const newText = processed.join('');

  // 4. Compute original document full range
  const lines = text.split(/\r?\n/);
  const lastLine = lines.length - 1;
  const lastChar = lines[lastLine].length;

  // 5. Return a single TextEdit replacing the entire document
  return [
    TextEdit.replace(
      new Range(
        new Position(0, 0),
        new Position(lastLine, lastChar)
      ),
      newText
    )
  ];
}
