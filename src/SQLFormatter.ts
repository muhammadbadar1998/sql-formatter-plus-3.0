import { TextEdit, Range, Position } from 'vscode';
import { to_indent, new_line } from './WordList';

export function formatDocument(
  text: string,
  uppercase: boolean = true,
  indentSize: number = 2
): TextEdit[] {
  // 1) Combined regex now includes single‐line comments:
  //    • '…'   strings
  //    • "…"   strings
  //    • {…}   braced literals
  //    • […]   bracketed identifiers
  //    • --…   single‐line comments
  //    • punctuation (, ) ;)
  //    • words (\b\w+\b)
  //    • whitespace (\s+) — we'll strip these out and regenerate spacing
  const tokenRegex = /('(?:[^']|'')*')|"(?:[^"]|"")*"|\{(?:[^{}]|\{\})*\}|\[(?:[^\]]|\]\])*\]|--[^\r\n]*|([(),;])|(\b\w+\b)|(\s+)/g;
  const rawTokens = Array.from(text.matchAll(tokenRegex), m => m[0]);
  // drop pure‐whitespace tokens; we’ll build all indentation/newlines ourselves
  const tokens = rawTokens.filter(t => !/^\s+$/.test(t));

  let indentLevel = 0;
  let formatted = '';

  for (const token of tokens) {
    // —— HANDLE single‐line comments
    if (token.startsWith('--')) {
      const indentSpaces = ' '.repeat(indentLevel * indentSize);
      // if a comma got split onto its own line just before this comment,
      // pull that comma back up and attach both comma+comment to the previous line
      if (/\n[ \t]*,$/.test(formatted)) {
        formatted = formatted.replace(/\n[ \t]*,$/, '');          // drop the lone “newline+spaces+,”
        formatted = formatted.trimEnd()                           // trim any trailing spaces
                  + ', ' + token                                   // comma + space + comment
                  + '\n' + indentSpaces;                          // then newline + current indent
      } else {
        // otherwise just tack the comment onto whatever’s on this line
        formatted = formatted.trimEnd()
                  + ' ' + token
                  + '\n' + indentSpaces;
      }
      continue;
    }

    // —— HANDLE literals & bracketed identifiers: copy verbatim
    if (
      token.startsWith("'") ||
      token.startsWith('"') ||
      token.startsWith('{') ||
      token.startsWith('[')
    ) {
      formatted += token;
      continue;
    }

    // —— EVERYTHING ELSE: keywords, punctuation, words
    const word = uppercase ? token.toUpperCase() : token;

    // newline‐before logic
    if (new_line.includes(word.trim().toUpperCase())) {
      formatted = formatted.trimEnd()
                + '\n'
                + ' '.repeat(indentLevel * indentSize);
    }

    formatted += word;

    // adjust indent‐level
    if (to_indent.includes(word.trim().toUpperCase())) {
      indentLevel++;
    } else if (word.trim().toUpperCase() === 'END') {
      indentLevel = Math.max(0, indentLevel - 1);
      formatted = formatted.trimEnd()
                + '\n'
                + ' '.repeat(indentLevel * indentSize);
    }
  }

  // —— finally replace the whole document
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
