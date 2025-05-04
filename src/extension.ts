// src/extension.ts
import * as vscode from 'vscode';
import { formatDocument } from './SQLFormatter';

export function activate(context: vscode.ExtensionContext) {
  console.log('SQL Formatter Plus is now active!');

  // Use registerTextEditorCommand to get the active editor & edit builder
  const disposable = vscode.commands.registerTextEditorCommand(
    'sql-formatter-plus.format_sql',
    (editor, editBuilder) => {
      const doc = editor.document;
      const fullText = doc.getText();
      // true = uppercase keywords, indentSize = 2 spaces
      const textEdits = formatDocument(fullText, true, 2);

      // Apply each TextEdit returned by your formatter
      textEdits.forEach(te => {
        editBuilder.replace(te.range, te.newText);
      });
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {
  // nothing to clean up
}
