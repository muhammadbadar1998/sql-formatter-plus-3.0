// src/sqlFormatter.ts

/**
 * sqlFormatter module
 * Provides document formatting logic for T-SQL,
 * including keyword casing and handling quoted segments (single and double quotes).
 */

import { TextEdit, Range, Position } from 'vscode';
import { sqlKeywords } from './WordList';

/**
 * Format the given SQL text, uppercasing keywords, splitting quoted strings
 * into individually quoted words, and preserving quoted literals.
 *
 * @param text - the entire SQL document or selection text
 * @param uppercase - whether to uppercase SQL keywords (default: true)
 * @param indentSize - number of spaces per indent level (currently unused)
 * @returns an array of TextEdit objects describing replacements to apply
 */
export function formatDocument(
  text: string,
  uppercase: boolean = true,
  indentSize: number = 2
): TextEdit[] {
  // 1. Prepare an array to collect all edits
  const edits: TextEdit[] = [];

  // 2. Split document into lines (supports LF and CRLF)
  const lines = text.split(/\r?\n/);

  // 3. Iterate through each line
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 4. Split line into segments: unquoted and quoted (single or double)
    //    e.g. ['SELECT * ', "'foo bar'", ' WHERE ...']
    const parts = line.split(/('.*?'|".*?")/g);

    // 5. Process each segment
    for (let j = 0; j < parts.length; j++) {
      const segment = parts[j];

      // 5a. If segment is quoted (single or double)
      if (
        (segment.startsWith('"') && segment.endsWith('"')) ||
        (segment.startsWith("'") && segment.endsWith("'"))
      ) {
        // Identify quote character
        const quoteChar = segment[0];
        // Remove outer quotes
        const inner = segment.slice(1, -1);
        // Split into words by whitespace
        const words = inner.split(/\s+/);
        // Reassemble each word wrapped in the same quote
        parts[j] = words.map(w => `${quoteChar}${w}${quoteChar}`).join(' ');
      } else {
        // 5b. Unquoted segment: apply keyword casing
        sqlKeywords.forEach(kw => {
          // Match full word, case-insensitive
          const re = new RegExp(`\\b${kw}\\b`, 'gi');
          parts[j] = parts[j].replace(
            re,
            uppercase ? kw : kw.toLowerCase()
          );
        });
      }
    }

    // 6. Re-join parts to form the new line
    const newLine = parts.join('');

    // 7. Create a TextEdit replacing the old line with the new one
    edits.push(
      TextEdit.replace(
        new Range(
          new Position(i, 0),              // start at this line, column 0
          new Position(i, lines[i].length) // end at original line length
        ),
        newLine
      )
    );
  }

  // 8. Return all computed edits
  return edits;
}
