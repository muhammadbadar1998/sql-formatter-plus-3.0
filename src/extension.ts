import * as vscode from 'vscode';
import { formatSql, isSelectionSafe } from './SQLFormatter';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerTextEditorCommand(
		'sql-formatter-plus.format_sql',
		(editor, editBuilder) => {
			const selection = editor.selection;
			const range = selection.isEmpty
				? new vscode.Range(
						new vscode.Position(0, 0),
						editor.document.lineAt(editor.document.lineCount - 1).range.end
					)
				: selection;
			const fullText = editor.document.getText();
			if (
				!selection.isEmpty &&
				!isSelectionSafe(
					fullText,
					editor.document.offsetAt(selection.start),
					editor.document.offsetAt(selection.end)
				)
			) {
				return;
			}
			const original = editor.document.getText(range);

			try {
				const indentSize =
					typeof editor.options.tabSize === 'number' ? editor.options.tabSize : 2;
				const formatted = formatSql(original, { uppercase: true, indentSize });
				if (formatted !== original) {
					editBuilder.replace(range, formatted);
				}
			} catch (error) {
				console.error('SQL Formatter Plus failed to format the document', error);
			}
		}
	);

	context.subscriptions.push(disposable);
}

export function deactivate() {}
