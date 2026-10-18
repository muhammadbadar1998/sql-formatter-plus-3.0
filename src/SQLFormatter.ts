export interface FormatOptions {
	uppercase?: boolean;
	indentSize?: number;
}

type TokenType =
	| 'word'
	| 'literal'
	| 'comment'
	| 'number'
	| 'variable'
	| 'op'
	| 'punct'
	| 'sqlcmd'
	| 'batch';

interface Token {
	type: TokenType;
	value: string;
	upper: string;
}

interface Paren {
	multi: boolean;
	indent: number;
	close: number;
	body: number;
	clause: string;
}

interface Block {
	type: 'case' | 'begin';
	indent: number;
}

const wordSet = (text: string) => new Set(text.trim().split(/\s+/));
const phraseSet = (text: string) =>
	new Set(
		text
			.split('|')
			.map((phrase) => phrase.trim())
			.filter(Boolean)
	);

const KEYWORDS = wordSet(
	`ADD ALL ALTER AND ANY APPLY AS ASC AUTHORIZATION BACKUP BEGIN BETWEEN BREAK BROWSE BULK BY
	CASCADE CASE CAST CATCH CHECK CHECKPOINT CLOSE CLUSTERED COALESCE COLLATE COLUMN COMMIT COMPUTE
	CONSTRAINT CONTAINS CONTAINSTABLE CONTINUE CONVERT CREATE CROSS CURRENT CURRENT_DATE CURRENT_TIME
	CURRENT_TIMESTAMP CURRENT_USER CURSOR DATABASE DBCC DEALLOCATE DECLARE DEFAULT DELETE DENY DESC
	DISK DISTINCT DISTRIBUTED DOUBLE DROP DUMP ELSE END ERRLVL ESCAPE EXCEPT EXEC EXECUTE EXISTS EXIT
	EXTERNAL FETCH FILE FILLFACTOR FOR FOREIGN FREETEXT FREETEXTTABLE FROM FULL FUNCTION GOTO GRANT
	GROUP HAVING HOLDLOCK IDENTITY IDENTITY_INSERT IDENTITYCOL IF IN INDEX INNER INSERT INTERSECT INTO
	IS JOIN KEY KILL LEFT LIKE LINENO LOAD MERGE NATIONAL NOCHECK NONCLUSTERED NOT NULL NULLIF OF OFF
	OFFSET OFFSETS ON OPEN OPENDATASOURCE OPENQUERY OPENROWSET OPENXML OPTION OR ORDER OUTER OVER
	OUTPUT PARTITION PIVOT PLAN PRECISION PRIMARY PRINT PROC PROCEDURE PUBLIC RAISERROR READ READTEXT
	RECONFIGURE REFERENCES REPLICATION RESTORE RESTRICT RETURN REVERT REVOKE RIGHT ROLLBACK ROWCOUNT
	ROWGUIDCOL RULE SAVE SCHEMA SECURITYAUDIT SELECT SEMANTICKEYPHRASETABLE
	SEMANTICSIMILARITYDETAILSTABLE SEMANTICSIMILARITYTABLE SESSION_USER SET SETUSER SHUTDOWN SOME
	STATISTICS SYSTEM_USER TABLE TABLESAMPLE TEXTSIZE THEN TO TOP TRAN TRANSACTION TRIGGER TRUNCATE
	TRY TRY_CONVERT TSEQUAL UNION UNIQUE UNPIVOT UPDATE UPDATETEXT USE USER VALUES VARYING VIEW
	WAITFOR WHEN WHERE WHILE WITH WITHIN WRITETEXT
	ABSOLUTE ACTION ARE ASSERTION AT BIT CASCADED CATALOG CHAR CHARACTER CONNECT CONNECTION CONSTRAINTS
	CORRESPONDING DATE DAY DEC DECIMAL DEFERRABLE DEFERRED DESCRIBE DESCRIPTOR DIAGNOSTICS DISCONNECT
	DOMAIN EXCEPTION EXTRACT FALSE FLOAT FOUND FREE GET GLOBAL HOUR IMMEDIATE INCLUDE INDICATOR
	INITIALLY INSENSITIVE INT INTEGER INTERVAL ISOLATION LANGUAGE LAST LEADING LEVEL LOCAL LOWER MATCH
	MINUTE MODULE MONTH NAMES NATURAL NCHAR NEXT NO NONE NUMERIC OCTET_LENGTH ONLY PARTIAL POSITION
	PRIVILEGES REAL RELATIVE RESULT ROWS SCROLL SECOND SECTION SESSION SIZE SMALLINT SPACE SQL SQLCA
	SQLCODE SQLERROR SQLSTATE SQLWARNING SUBSTRING TEMPORARY TIME TIMEZONE_HOUR TIMEZONE_MINUTE
	TIMESTAMP TRAILING TRUE UNKNOWN USAGE USING VALUE VARCHAR NVARCHAR WHENEVER WORK WRITE YEAR ZONE
	MATCHED TARGET SOURCE SEQUENCE AFTER INSTEAD
	BIGINT TINYINT SMALLMONEY MONEY DATETIME DATETIME2 DATETIMEOFFSET SMALLDATETIME NTEXT IMAGE BINARY
	VARBINARY UNIQUEIDENTIFIER SQL_VARIANT GEOGRAPHY GEOMETRY HIERARCHYID ROWVERSION
	JSON XML AUTO RAW EXPLICIT PATH INCLUDE FILTER RECOMPILE MAXDOP NOLOCK READPAST ROWLOCK UPDLOCK
	XLOCK TABLOCK TABLOCKX PAGLOCK NOWAIT KEEP IGNORE_DUP_KEY PAD_INDEX SORT_IN_TEMPDB
	ONLINE ALLOW_ROW_LOCKS ALLOW_PAGE_LOCKS DATA_COMPRESSION NOCOUNT XACT_ABORT ANSI_NULLS ANSI_PADDING
	ANSI_WARNINGS ARITHABORT CONCAT_NULL_YIELDS_NULL NUMERIC_ROUNDABORT QUOTED_IDENTIFIER NOEXEC
	SHOWPLAN_ALL SHOWPLAN_TEXT SHOWPLAN_XML IMPLICIT_TRANSACTIONS TRY_CAST
	UNBOUNDED PRECEDING FOLLOWING RANGE GROUPS TIES PERCENT`
);

const PHRASES = `LEFT OUTER JOIN
RIGHT OUTER JOIN
FULL OUTER JOIN
CREATE OR ALTER
LEFT JOIN
RIGHT JOIN
FULL JOIN
INNER JOIN
CROSS JOIN
CROSS APPLY
OUTER APPLY
PRIMARY KEY
FOREIGN KEY
GROUP BY
ORDER BY
UNION ALL
INSERT INTO
DELETE FROM
MERGE INTO
TRUNCATE TABLE
WITHIN GROUP`
	.trim()
	.split('\n')
	.map((phrase) => phrase.trim().split(/\s+/));

const PHRASE_SET = new Set(PHRASES.map((phrase) => phrase.join(' ')));
const JOIN_CLAUSES = phraseSet(
	`JOIN|INNER JOIN|LEFT JOIN|LEFT OUTER JOIN|RIGHT JOIN|RIGHT OUTER JOIN|FULL JOIN|FULL OUTER JOIN|CROSS JOIN|CROSS APPLY|OUTER APPLY`
);
const BREAK_AFTER_CLAUSES = phraseSet(
	`SELECT|FROM|WHERE|GROUP BY|HAVING|ORDER BY|SET|VALUES|OUTPUT|USING`
);
const SIMPLE_CLAUSES = phraseSet(
	`INSERT|INSERT INTO|UPDATE|DELETE|DELETE FROM|MERGE|MERGE INTO|CREATE|CREATE OR ALTER|ALTER|DROP|TRUNCATE|TRUNCATE TABLE|USE|EXEC|EXECUTE|DECLARE|PRINT|RETURN|THROW|RAISERROR|WAITFOR|IF|WHILE|ELSE|OPTION|FOR|INTO|OFFSET|FETCH|BEGIN`
);
const SET_UNION_CLAUSES = phraseSet(`UNION|UNION ALL|EXCEPT|INTERSECT`);
const NON_BLOCK_BEGIN = wordSet(`TRAN TRANSACTION DISTRIBUTED DIALOG CONVERSATION`);
const CANCEL_DDL = wordSet(`ADD DROP ALTER CONSTRAINT DEFAULT CHECK UNIQUE REFERENCES FOREIGN PRIMARY`);
const PRESERVE_CASE = wordSet(
	`DATE DAY HOUR MINUTE MONTH SECOND YEAR VALUE KEY ACTION SOURCE TARGET PATH LEVEL PLAN SIZE SPACE WORK ZONE`
);
const FUNCTION_WORDS = wordSet(`CAST CONVERT COALESCE NULLIF TRY_CONVERT TRY_CAST IIF ISNULL LEFT
	RIGHT LEN LTRIM RTRIM UPPER LOWER SUBSTRING REPLACE CHARINDEX STUFF FORMAT ROUND ABS CEILING FLOOR
	POWER SQRT GETDATE SYSDATETIME NEWID SCOPE_IDENTITY ERROR_MESSAGE ERROR_NUMBER OBJECT_ID DB_ID
	SCHEMA_ID IDENTITY INT BIGINT SMALLINT TINYINT BIT DECIMAL NUMERIC FLOAT REAL CHAR VARCHAR NCHAR
	NVARCHAR BINARY VARBINARY DATETIME DATETIME2 DATETIMEOFFSET SMALLDATETIME TIME MONEY SMALLMONEY`);

const TOKEN_RE =
	/(?:[Nn]?'(?:[^']|'')*'?|"(?:[^"]|"")*"?|\[(?:[^\]]|\]\])*\]?|\{[^}]*\}?|\$\([^)]*\)|[$£¤¥][+-]?\d+(?:\.\d*)?|\$[\p{L}_][\p{L}\p{N}_$#]*|@@?[\p{L}\p{N}_$#]+|##?[\p{L}\p{N}_$#]+|0[xX][\dA-Fa-f]+|\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[\p{L}_][\p{L}\p{N}_$@#]*|<>|!=|!<|!>|<=|>=|\+=|-=|\*=|\/=|%=|::|--[^\r\n]*|[\s\S])/uy;

function tokenize(sql: string): Token[] {
	const tokens: Token[] = [];
	let index = 0;
	let atLineStart = true;

	while (index < sql.length) {
		const char = sql[index];

		if (
			atLineStart &&
			(char === ':' || (char === '!' && sql[index + 1] === '!'))
		) {
			const end = sql.indexOf('\n', index);
			let stop = end === -1 ? sql.length : end;
			if (stop > index && sql[stop - 1] === '\r') {
				stop--;
			}
			tokens.push({ type: 'sqlcmd', value: sql.slice(index, stop), upper: '' });
			index = stop;
			atLineStart = false;
			continue;
		}

		if (char === '/' && sql[index + 1] === '*') {
			let depth = 1;
			let cursor = index + 2;
			while (cursor < sql.length && depth > 0) {
				if (sql.startsWith('/*', cursor)) {
					depth++;
					cursor += 2;
				} else if (sql.startsWith('*/', cursor)) {
					depth--;
					cursor += 2;
				} else {
					cursor++;
				}
			}
			const value = sql.slice(index, cursor);
			tokens.push({ type: 'comment', value, upper: '' });
			index = cursor;
			atLineStart = endsAtLineStart(value);
			continue;
		}

		TOKEN_RE.lastIndex = index;
		const start = index;
		const match = TOKEN_RE.exec(sql);
		if (!match) {
			tokens.push({ type: 'op', value: char, upper: char });
			index++;
			atLineStart = false;
			continue;
		}

		const value = match[0];
		index = TOKEN_RE.lastIndex;
		if (/^\s+$/.test(value)) {
			if (value.includes('\n') || value.includes('\r')) {
				atLineStart = true;
			}
			continue;
		}

		const token = classify(value);
		if (token.upper === 'GO' && atLineStart && isBatchLine(sql, start, index)) {
			token.type = 'batch';
		}
		tokens.push(token);
		atLineStart = endsAtLineStart(value);
	}

	return combinePhrases(tokens);
}

function endsAtLineStart(value: string): boolean {
	const lastBreak = Math.max(value.lastIndexOf('\n'), value.lastIndexOf('\r'));
	return lastBreak !== -1 && /^[ \t]*$/.test(value.slice(lastBreak + 1));
}

function isBatchLine(sql: string, start: number, end: number): boolean {
	const lineStart = sql.lastIndexOf('\n', start - 1) + 1;
	const lineEnd = sql.indexOf('\n', end);
	const line = sql.slice(lineStart, lineEnd === -1 ? sql.length : lineEnd).replace(/\r$/, '');
	return /^\s*GO(?:\s+\d+)?\s*(?:--.*)?$/i.test(line);
}

function classify(value: string): Token {
	const first = value[0];
	const upper = value.toUpperCase();
	let type: TokenType;

	if (value.startsWith('--')) {
		type = 'comment';
	} else if (
		first === "'" ||
		(first === 'N' && value[1] === "'") ||
		(first === 'n' && value[1] === "'") ||
		first === '"' ||
		first === '[' ||
		first === '{' ||
		value.startsWith('$(')
	) {
		type = 'literal';
	} else if (first === '@') {
		type = 'variable';
	} else if (/^[$£¤¥][+-]?\d/.test(value)) {
		type = 'number';
	} else if (first === '$') {
		type = 'word';
	} else if (/^0[xX]/.test(value) || /^\d/.test(value)) {
		type = 'number';
	} else if (/^[\p{L}_#]/u.test(first)) {
		type = 'word';
	} else if (value.length === 1 && ',;.()'.includes(value)) {
		type = 'punct';
	} else {
		type = 'op';
	}

	return { type, value, upper };
}

function combinePhrases(tokens: Token[]): Token[] {
	const combined: Token[] = [];

	for (let index = 0; index < tokens.length; index++) {
		let matched = false;
		for (const phrase of PHRASES) {
			if (
				index + phrase.length <= tokens.length &&
				phrase.every(
					(word, offset) =>
						tokens[index + offset].type === 'word' &&
						tokens[index + offset].upper === word
				)
			) {
				const value = phrase
					.map((_, offset) => tokens[index + offset].value)
					.join(' ');
				combined.push({ type: 'word', value, upper: value.toUpperCase() });
				index += phrase.length - 1;
				matched = true;
				break;
			}
		}
		if (!matched) {
			combined.push(tokens[index]);
		}
	}

	return combined;
}

function nextUpper(tokens: Token[], from: number): string {
	for (let index = from; index < tokens.length; index++) {
		if (tokens[index].type !== 'comment') {
			return tokens[index].upper;
		}
	}
	return '';
}

function formatTokens(tokens: Token[], options: FormatOptions, eol = '\n'): string {
	const indentSize = Math.max(0, options.indentSize ?? 2);
	const uppercase = options.uppercase ?? true;
	const lines: string[] = [];
	const parens: Paren[] = [];
	const blocks: Block[] = [];

	let line = '';
	let lineIndent = 0;
	let indent = 0;
	let bodyIndent = 0;
	let clause = '';
	let previous: Token | undefined;
	let noSpace = false;
	let lastSpace = false;
	let between = false;
	let afterThen = false;
	let inMerge = false;
	let mergeAction = false;
	let ddlParenPending = false;
	let inTrigger = false;

	const spaces = (level: number) => ' '.repeat(Math.max(0, level) * indentSize);

	const write = (text: string, spaceBefore = !noSpace) => {
		line += line
			? (spaceBefore && !lastSpace ? ' ' : '') + text
			: spaces(lineIndent) + text;
		lastSpace = text.endsWith(' ');
		noSpace = false;
	};

	const breakLine = (level = indent) => {
		if (line.trim()) {
			lines.push(line);
		}
		line = '';
		lineIndent = Math.max(0, level);
		lastSpace = false;
	};

	const blankLine = () => {
		breakLine(indent);
		if (lines.length > 0 && lines[lines.length - 1] !== '') {
			lines.push('');
		}
	};

	const display = (token: Token) => {
		if (!KEYWORDS.has(token.upper) && !PHRASE_SET.has(token.upper)) {
			return token.value;
		}
		if (PRESERVE_CASE.has(token.upper)) {
			return token.value;
		}
		return uppercase ? token.upper : token.value.toLowerCase();
	};

	const inline = () => {
		const top = parens[parens.length - 1];
		return !!top && !top.multi;
	};

	const clauseStart = (token: Token, breakAfter: boolean, bodyOffset = 1) => {
		breakLine(indent);
		write(display(token), false);
		clause = token.upper;
		bodyIndent = indent + bodyOffset;
		if (breakAfter) {
			breakLine(bodyIndent);
		}
	};

	const resetStatement = () => {
		clause = '';
		bodyIndent = indent;
		between = false;
		afterThen = false;
		inMerge = false;
		mergeAction = false;
		ddlParenPending = false;
		inTrigger = false;
	};

	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index];
		const upper = token.upper;

		if (token.type === 'sqlcmd') {
			breakLine(0);
			write(token.value, false);
			breakLine(0);
			previous = token;
			continue;
		}

		if (token.type === 'comment') {
			const emptyLine = !line.trim();
			write(token.value, !emptyLine);
			if (emptyLine || token.value.startsWith('--') || token.value.includes('\n')) {
				breakLine(indent);
			}
			previous = token;
			continue;
		}

		if (token.type === 'punct') {
			if (token.value === '(') {
				const previousKeyword =
					previous?.type === 'word' &&
					(KEYWORDS.has(previous.upper) || PHRASE_SET.has(previous.upper));
				const previousOperand =
					!!previous &&
					(previous.type === 'word' ||
						previous.type === 'variable' ||
						previous.type === 'number' ||
						previous.type === 'literal' ||
						previous.value === ')' ||
						previous.value === ']');
				const functionLike =
					!!previous && previous.type === 'word' && FUNCTION_WORDS.has(previous.upper);
				const next = nextUpper(tokens, index + 1);
				const multi =
					!inline() &&
					(next === 'SELECT' ||
						next === 'WITH' ||
						next === 'VALUES' ||
						(ddlParenPending && (!previousKeyword || previous?.upper === 'TABLE')));
				const spaceBefore = multi || (!functionLike && (!previous || !previousOperand || previousKeyword));

				write('(', spaceBefore);
				if (multi) {
					ddlParenPending = false;
					parens.push({ multi: true, indent, close: lineIndent, body: bodyIndent, clause });
					indent = Math.max(indent + 1, lineIndent + 1);
					bodyIndent = indent;
					clause = '';
					breakLine(indent);
				} else {
					parens.push({ multi: false, indent, close: lineIndent, body: bodyIndent, clause });
					noSpace = true;
				}
			} else if (token.value === ')') {
				const paren = parens.pop();
				if (paren?.multi) {
					breakLine(paren.close);
					write(')', false);
					indent = paren.indent;
					bodyIndent = paren.body;
					clause = paren.clause;
				} else {
					write(')', false);
				}
			} else if (token.value === ',') {
				write(',', false);
				if (inline()) {
					noSpace = false;
				} else {
					breakLine(bodyIndent);
				}
			} else if (token.value === ';') {
				write(';', false);
				breakLine(indent);
				resetStatement();
			} else {
				write('.', false);
				noSpace = true;
			}
			previous = token;
			continue;
		}

		if (token.type === 'op') {
			if (token.value === ':') {
				write(':', false);
				previous = token;
				continue;
			}
			if (token.value === '::') {
				write('::', false);
				noSpace = true;
				previous = token;
				continue;
			}
			const unary =
				(token.value === '-' || token.value === '+' || token.value === '~') &&
				(!previous ||
					previous.type === 'op' ||
					previous.value === '(' ||
					previous.value === ',' ||
					(previous.type === 'word' &&
						KEYWORDS.has(previous.upper) &&
						[
							'SELECT',
							'THEN',
							'ELSE',
							'WHEN',
							'BY',
							'SET',
							'VALUES',
							'RETURN',
							'AND',
							'OR',
							'BETWEEN',
							'IN',
							'ON',
							'WHERE',
							'HAVING',
							'OFFSET',
							'FETCH',
						].includes(previous.upper)));
			if (unary) {
				const attach = !line || previous?.value === '(';
				write(token.value, !attach);
				noSpace = true;
			} else {
				write(token.value);
				noSpace = false;
			}
			previous = token;
			continue;
		}

		if (token.type === 'batch') {
			blankLine();
			breakLine(0);
			write(uppercase ? 'GO' : 'go', false);
			if (tokens[index + 1]?.type === 'number') {
				write(tokens[index + 1].value);
				index++;
			}
			breakLine(0);
			indent = 0;
			blocks.length = 0;
			parens.length = 0;
			resetStatement();
			if (index + 1 < tokens.length) {
				blankLine();
			}
			previous = token;
			continue;
		}

		if (token.type !== 'word') {
			write(token.value);
			previous = token;
			continue;
		}

		if (ddlParenPending && CANCEL_DDL.has(upper)) {
			ddlParenPending = false;
		}
		if (upper === 'WITH' && nextUpper(tokens, index + 1) === '(') {
			ddlParenPending = false;
		}

		if (afterThen && !(inMerge && ['UPDATE', 'INSERT', 'DELETE'].includes(upper))) {
			afterThen = false;
		}

		if (upper === 'BEGIN') {
			const next = nextUpper(tokens, index + 1);
			breakLine(indent);
			write(display(token), false);
			if (next === 'TRY' || next === 'CATCH') {
				const nextToken = tokens[index + 1];
				if (nextToken?.type === 'word') {
					write(display(nextToken));
					index++;
				}
			}
			if (!NON_BLOCK_BEGIN.has(next)) {
				blocks.push({ type: 'begin', indent });
				indent++;
				bodyIndent = indent;
				clause = 'BEGIN';
				breakLine(indent);
			}
			previous = token;
			continue;
		}

		if (upper === 'END') {
			const block = blocks.pop();
			if (block?.type === 'case') {
				breakLine(block.indent);
				write(display(token), false);
				bodyIndent = block.indent;
				clause = 'CASE';
			} else if (block?.type === 'begin') {
				breakLine(block.indent);
				let value = display(token);
				const next = nextUpper(tokens, index + 1);
				if (next === 'TRY' || next === 'CATCH') {
					const nextToken = tokens[index + 1];
					if (nextToken?.type === 'word') {
						value += ` ${display(nextToken)}`;
						index++;
					}
				}
				write(value, false);
				indent = block.indent;
				bodyIndent = block.indent;
				clause = '';
			} else {
				breakLine(indent);
				write(display(token), false);
			}
			previous = token;
			continue;
		}

		if (upper === 'CASE') {
			const base = lineIndent;
			blocks.push({ type: 'case', indent: base });
			write(display(token));
			bodyIndent = base + 1;
			clause = 'CASE';
			breakLine(bodyIndent);
			previous = token;
			continue;
		}

		if (upper === 'WHEN') {
			const top = blocks[blocks.length - 1];
			if (top?.type === 'case') {
				breakLine(top.indent + 1);
				bodyIndent = top.indent + 1;
			} else {
				breakLine(indent);
				bodyIndent = indent;
			}
			write(display(token), false);
			clause = 'WHEN';
			previous = token;
			continue;
		}

		if (upper === 'THEN') {
			write(display(token));
			afterThen = true;
			previous = token;
			continue;
		}

		if (upper === 'ELSE') {
			const top = blocks[blocks.length - 1];
			if (top?.type === 'case') {
				breakLine(top.indent + 1);
				bodyIndent = top.indent + 1;
			} else {
				breakLine(indent);
				bodyIndent = indent;
			}
			write(display(token), false);
			clause = 'ELSE';
			previous = token;
			continue;
		}

		if (inline()) {
			if (upper === 'BETWEEN') {
				between = true;
			} else if (upper === 'AND' && between) {
				between = false;
			}
			write(display(token));
			previous = token;
			continue;
		}

		if (upper === 'BETWEEN') {
			between = true;
			write(display(token));
			previous = token;
			continue;
		}

		if (upper === 'AND' || upper === 'OR') {
			if (between && upper === 'AND') {
				between = false;
				write(display(token));
			} else {
				breakLine(bodyIndent);
				write(display(token), false);
			}
			previous = token;
			continue;
		}

		if (upper === 'ON' && (JOIN_CLAUSES.has(clause) || clause === 'USING')) {
			const onIndent = bodyIndent + 1;
			breakLine(onIndent);
			write(display(token), false);
			bodyIndent = onIndent;
			clause = 'ON';
			previous = token;
			continue;
		}

		if (JOIN_CLAUSES.has(upper)) {
			breakLine(indent + 1);
			write(display(token), false);
			clause = upper;
			bodyIndent = indent + 1;
			previous = token;
			continue;
		}

		if (upper === 'WITH' && nextUpper(tokens, index + 1) !== '(') {
			const next = nextUpper(tokens, index + 1);
			if (next === 'CHECK' || next === 'NOCHECK' || next === 'TIES') {
				write(display(token));
				previous = token;
				continue;
			}
			clauseStart(token, false, 0);
			previous = token;
			continue;
		}
		if (inMerge && afterThen && ['UPDATE', 'INSERT', 'DELETE'].includes(upper)) {
			breakLine(indent + 1);
			write(display(token), false);
			clause = 'ACTION';
			bodyIndent = indent + 2;
			afterThen = false;
			mergeAction = true;
			previous = token;
			continue;
		}

		if (upper === 'SET' && mergeAction) {
			write(display(token));
			bodyIndent = indent + 2;
			clause = 'SET';
			breakLine(bodyIndent);
			previous = token;
			continue;
		}

		if (upper === 'VALUES' && mergeAction) {
			breakLine(indent + 1);
			write(display(token), false);
			bodyIndent = indent + 2;
			clause = 'VALUES';
			breakLine(bodyIndent);
			previous = token;
			continue;
		}

		if (upper === 'SET') {
			const standalone = !line.trim();
			if (!standalone) {
				breakLine(indent);
			}
			write(display(token), !standalone);
			clause = 'SET';
			bodyIndent = standalone ? indent : indent + 1;
			if (!standalone) {
				breakLine(bodyIndent);
			}
			previous = token;
			continue;
		}

		if (upper === 'USING') {
			clauseStart(token, true, 1);
			previous = token;
			continue;
		}

		if (upper === 'IF' && line.trim()) {
			write(display(token));
			bodyIndent = indent;
			clause = 'IF';
			previous = token;
			continue;
		}

		if (upper === 'AS') {
			ddlParenPending = false;
			inTrigger = false;
		}

		if (inTrigger && ['INSERT', 'UPDATE', 'DELETE'].includes(upper)) {
			write(display(token));
			previous = token;
			continue;
		}

		if (
			upper === 'FOR' &&
			(inTrigger ||
				(line.trim() &&
					!['JSON', 'XML', 'BROWSE', 'SELECT', 'UPDATE'].includes(
						nextUpper(tokens, index + 1)
					)))
		) {
			write(display(token));
			previous = token;
			continue;
		}

		if (SIMPLE_CLAUSES.has(upper) || BREAK_AFTER_CLAUSES.has(upper)) {
			clauseStart(token, BREAK_AFTER_CLAUSES.has(upper), 1);
			if (upper === 'CREATE' || upper === 'CREATE OR ALTER' || upper === 'ALTER') {
				ddlParenPending = true;
				inTrigger = nextUpper(tokens, index + 1) === 'TRIGGER';
			}
			if (upper === 'MERGE' || upper === 'MERGE INTO') {
				inMerge = true;
			}
			previous = token;
			continue;
		}

		if (SET_UNION_CLAUSES.has(upper)) {
			breakLine(indent);
			write(display(token), false);
			bodyIndent = indent;
			clause = upper;
			breakLine(indent);
			previous = token;
			continue;
		}

		write(display(token));
		previous = token;
	}

	breakLine();
	while (lines[0] === '') {
		lines.shift();
	}
	while (lines[lines.length - 1] === '') {
		lines.pop();
	}
	return lines.join(eol);
}

export function formatSql(text: string, options: FormatOptions = {}): string {
	const bom = text.startsWith('\uFEFF') ? '\uFEFF' : '';
	const source = text.replace(/^\uFEFF/, '');

	if (!source.trim()) {
		return text;
	}

	try {
		const eol = text.includes('\r\n') ? '\r\n' : '\n';
		const hasFinalNewline = /[\r\n]$/.test(source);
		const formatted = formatTokens(tokenize(source), options, eol);

		if (!formatted) {
			return text;
		}
		return (
			bom +
			(hasFinalNewline && !/[\r\n]$/.test(formatted) ? formatted + eol : formatted)
		);
	} catch {
		return text;
	}
}

export function isSelectionSafe(text: string, start: number, end: number): boolean {
	const insideToken = (offset: number) => {
		let index = 0;
		let state: 'normal' | 'single' | 'double' | 'bracket' | 'line' | 'block' = 'normal';
		let blockDepth = 0;
		const limit = Math.min(Math.max(0, offset), text.length);

		while (index < limit) {
			const char = text[index];

			if (state === 'line') {
				if (char === '\n' || char === '\r') {
					state = 'normal';
				}
				index++;
			} else if (state === 'block') {
				if (text.startsWith('/*', index)) {
					blockDepth++;
					index += 2;
				} else if (text.startsWith('*/', index)) {
					blockDepth--;
					index += 2;
					if (blockDepth === 0) {
						state = 'normal';
					}
				} else {
					index++;
				}
			} else if (state === 'single') {
				if (char === "'") {
					if (text[index + 1] === "'") {
						index += 2;
					} else {
						state = 'normal';
						index++;
					}
				} else {
					index++;
				}
			} else if (state === 'double') {
				if (char === '"') {
					if (text[index + 1] === '"') {
						index += 2;
					} else {
						state = 'normal';
						index++;
					}
				} else {
					index++;
				}
			} else if (state === 'bracket') {
				if (char === ']') {
					if (text[index + 1] === ']') {
						index += 2;
					} else {
						state = 'normal';
						index++;
					}
				} else {
					index++;
				}
			} else if (char === '-' && text[index + 1] === '-') {
				state = 'line';
				index += 2;
			} else if (char === '/' && text[index + 1] === '*') {
				state = 'block';
				blockDepth = 1;
				index += 2;
			} else if (
				(char === ':' || (char === '!' && text[index + 1] === '!')) &&
				(index === 0 || text[index - 1] === '\n')
			) {
				state = 'line';
				index++;
			} else if (char === "'") {
				state = 'single';
				index++;
			} else if (char === '"') {
				state = 'double';
				index++;
			} else if (char === '[') {
				state = 'bracket';
				index++;
			} else {
				index++;
			}
		}

		return state !== 'normal';
	};

	return !insideToken(start) && !insideToken(end);
}
