import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('formats only the current selection', async () => {
		const document = await vscode.workspace.openTextDocument({
			language: 'sql',
			content: 'select 1;\nselect a,b from t;\n',
		});
		const editor = await vscode.window.showTextDocument(document);
		editor.selection = new vscode.Selection(
			new vscode.Position(1, 0),
			document.lineAt(1).range.end
		);

		await vscode.commands.executeCommand('sql-formatter-plus.format_sql');

		assert.strictEqual(
			document.getText(),
			'select 1;\nSELECT\n    a,\n    b\nFROM\n    t;\n'
		);
		await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
	});

	test('skips selections inside literals', async () => {
		const content = "SELECT 'it''s' AS x FROM t";
		const document = await vscode.workspace.openTextDocument({
			language: 'sql',
			content,
		});
		const editor = await vscode.window.showTextDocument(document);
		editor.selection = new vscode.Selection(
			new vscode.Position(0, 8),
			new vscode.Position(0, 12)
		);

		await vscode.commands.executeCommand('sql-formatter-plus.format_sql');

		assert.strictEqual(document.getText(), content);
		await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
	});
});
