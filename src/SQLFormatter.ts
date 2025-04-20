// 1. Import VS Code API types for constructing text edits:
import { TextEdit, Range, Position } from 'vscode';

// 2. Import your array of SQL keywords from the WordList file:
import { sqlKeywords } from './WordList';

// 3. Export a function that takes the full document text and returns an array of TextEdits:
export function formatDocument(
  text: string,              // the entire SQL document as one string
  uppercase: boolean = true, // whether to uppercase keywords (defaults to true)
  indentSize: number = 2     // spaces per indent (unused in this simple example)
): TextEdit[] {
  // 4. Prepare an array to collect all the edits we’ll return:
  const edits: TextEdit[] = [];

  // 5. Split the document into lines (handles both LF and CRLF):
  const lines = text.split(/\r?\n/);

  // 6. Iterate over each line by index:
  for (let i = 0; i < lines.length; i++) {
    // 7. Work on a mutable copy of the current line:
    let line = lines[i];

    // 8. For each keyword in your word list...
    sqlKeywords.forEach(kw => {
      // 9. Build a regex that matches the whole word, case‑insensitive:
      //    \b anchors ensure we don’t accidentally match substrings.
      const re = new RegExp(`\\b${kw}\\b`, 'gi');

      // 10. Replace all occurrences in the line with either the upper‑
      //     or lower‑case version of the keyword.
      line = line.replace(
        re,
        uppercase ? kw : kw.toLowerCase()
      );
    });

    // 11. Create a TextEdit that replaces the entire original line
    //     (from column 0 to its original length) with our new `line`:
    edits.push(
      TextEdit.replace(
        new Range(
          new Position(i, 0),                   // start: this line, col 0
          new Position(i, lines[i].length)      // end: this line, original end
        ),
        line                                    // the replacement text
      )
    );
  }

  // 12. Return all of our accumulated edits back to VS Code:
  return edits;
}
