import * as assert from 'assert';
import { formatSql, isSelectionSafe } from '../SQLFormatter';

const format = (sql: string) => formatSql(sql, { uppercase: true, indentSize: 2 });

suite('T-SQL formatter', () => {
	test('formats select clauses and lists', () => {
		const result = format(
			"select a,b from dbo.Users where a=1 and b<>'select from' order by a desc"
		);
		assert.strictEqual(
			result,
			[
				'SELECT',
				'  a,',
				'  b',
				'FROM',
				'  dbo.Users',
				'WHERE',
				'  a = 1',
				"  AND b <> 'select from'",
				'ORDER BY',
				'  a DESC',
			].join('\n')
		);
	});

	test('preserves identifier casing and literal contents', () => {
		const result = format(
			'select [MixedCase], "QuotedName", n\'select from where\' from [dbo].[MyTable]'
		);
		assert.match(result, /\[MixedCase\]/);
		assert.match(result, /"QuotedName"/);
		assert.match(result, /N'select from where'/i);
		assert.match(result, /\[dbo\]\.\[MyTable\]/);
		assert.doesNotMatch(result, /MIXEDCASE|MYTABLE/);
	});

	test('formats common table expressions and subqueries', () => {
		const result = format(
			'with cte as (select id,name from dbo.t where x=1) select * from cte'
		);
		assert.strictEqual(
			result,
			[
				'WITH cte AS (',
				'  SELECT',
				'    id,',
				'    name',
				'  FROM',
				'    dbo.t',
				'  WHERE',
				'    x = 1',
				')',
				'SELECT',
				'  *',
				'FROM',
				'  cte',
			].join('\n')
		);
	});

	test('formats create table column lists', () => {
		const result = format(
			'create table dbo.T(id int identity(1,1) primary key,name nvarchar(50) not null);'
		);
		assert.strictEqual(
			result,
			[
				'CREATE TABLE dbo.T (',
				'  id INT IDENTITY(1, 1) PRIMARY KEY,',
				'  name NVARCHAR(50) NOT NULL',
				');',
			].join('\n')
		);
	});

	test('formats try catch blocks', () => {
		const result = format(
			'begin try select 1; end try begin catch print error_message(); end catch'
		);
		assert.strictEqual(
			result,
			[
				'BEGIN TRY',
				'  SELECT',
				'    1;',
				'END TRY',
				'BEGIN CATCH',
				'  PRINT error_message();',
				'END CATCH',
			].join('\n')
		);
	});

	test('keeps between operators inline', () => {
		const result = format('select * from t where a between 1 and 5 and b=2');
		assert.match(result, /a BETWEEN 1 AND 5/);
		assert.match(result, /\n {2}AND b = 2/);
	});

	test('inline parentheses stay inline', () => {
		const result = format(
			'select row_number() over (partition by a order by b) rn, cast(x as int) y from t'
		);
		assert.match(result, /row_number\(\) OVER \(PARTITION BY a ORDER BY b\) rn/);
		assert.match(result, /CAST\(x AS INT\) y/);
	});

	test('formats go separators and sqlcmd lines', () => {
		const result = format(':setvar DbName MyDb\nselect * from t\ngo\nselect 1');
		assert.match(result, /^:setvar DbName MyDb$/m);
		assert.match(result, /^GO$/m);
		assert.ok(result.indexOf('GO') < result.lastIndexOf('SELECT'));
	});

	test('is idempotent across a T-SQL corpus', () => {
		const corpus = [
			'select a,b from t where a=1 and b=2',
			'insert into t(a,b) values(1,2),(3,4);',
			'update t set a=1,b=2 where id=3;',
			'delete from t where id in (select id from u where x=1);',
			'begin if exists(select 1 from t) begin select 1 end else begin select 2 end end',
			'select case when a=1 then 1 when a=2 then 2 else 0 end from t',
			'select count(*) over(partition by a order by b) from t',
			'with a as (select 1 x), b as (select 2 y) select * from a cross join b',
			'merge into t using s on t.id=s.id when matched then update set t.v=s.v when not matched then insert(id,v) values(s.id,s.v);',
			'create table #t(a int,b varchar(max));',
			'create trigger trg on t after insert as begin insert into log(a) values(1); end',
			'select top 10 percent with ties a,b from t order by a',
			'select * from t where a=1 /* or a=2 */ and b=3 -- trailing',
		];
		for (const sql of corpus) {
			const once = format(sql);
			assert.strictEqual(format(once), once, sql);
		}
	});

	test('handles empty and whitespace-only input', () => {
		assert.strictEqual(format(''), '');
		assert.strictEqual(format('  \r\n\t'), '  \r\n\t');
	});

	test('preserves CRLF documents', () => {
		const result = format('select a\r\nfrom t\r\n');
		assert.ok(result.includes('\r\n'));
		assert.ok(!/(?<!\r)\n/.test(result));
		assert.ok(result.endsWith('\r\n'));
	});

	test('supports lowercase keyword mode', () => {
		const result = formatSql('SELECT A FROM T WHERE B = 1', {
			uppercase: false,
			indentSize: 2,
		});
		assert.match(result, /^select$/m);
		assert.match(result, /^from$/m);
		assert.match(result, /^where$/m);
	});

	test('preserves T-SQL specific tokens', () => {
		const result = format(
			"select count(*), $PARTITION.pf(x), [a]]b], 'it''s', 'a--b' from #tmp;"
		);
		assert.match(result, /count\(\*\)/);
		assert.match(result, /\$PARTITION\.pf\(x\)/);
		assert.match(result, /\[a\]\]b\]/);
		assert.match(result, /'it''s'/);
		assert.match(result, /'a--b'/);
		assert.match(result, /#tmp/);
	});

	test('formats DDL guards and else-if chains', () => {
		const result = format(
			'drop table if exists dbo.t; if exists(select 1 from t) begin select 1 end else if exists(select 1 from u) begin select 2 end'
		);
		assert.match(result, /DROP TABLE IF EXISTS dbo\.t;/);
		assert.match(result, /ELSE IF EXISTS \(/);
	});

	test('does not double carriage returns inside literals', () => {
		const result = format("select 'a\r\nb'\r\nfrom t\r\n");
		assert.match(result, /'a\r\nb'/);
		assert.ok(!result.includes('\r\r\n'));
	});

	test('preserves sqlcmd shell and variable lines', () => {
		const result = format('!! echo hi\nselect $(DbName).dbo.t');
		assert.match(result, /^!! echo hi$/m);
		assert.match(result, /\$\(DbName\)\.dbo\.t/);
	});

	test('handles nested block comments', () => {
		const result = format('select /* outer /* inner */ tail */ 1');
		assert.match(result, /\/\* outer \/\* inner \*\/ tail \*\//);
	});

	test('never throws on incomplete SQL', () => {
		const samples = [
			"select 'unterminated",
			'select [unterminated',
			'/* unterminated',
			'begin try select 1',
			'select (((1)',
			'update t set',
		];
		for (const sql of samples) {
			assert.doesNotThrow(() => format(sql), sql);
		}
	});

	test('does not synthesize comments from adjacent operators', () => {
		const result = format('select 1 - -1 as x from t');
		assert.strictEqual(result, ['SELECT', '  1 - -1 AS x', 'FROM', '  t'].join('\n'));
		assert.ok(!result.includes('--'));
		assert.strictEqual(format(result), result);
	});

	test('spaces unary operators after commas and binary operators', () => {
		const result = format('select dateadd(day,-7,getdate()), x=-1, y=(-2) from t');
		assert.match(result, /dateadd\(day, -7, getdate\(\)\)/);
		assert.match(result, /x = -1/);
		assert.match(result, /y = \(-2\)/);
	});

	test('treats go as an identifier unless it is a batch line', () => {
		assert.match(format('select 1 as go from t'), /1 AS go/);
		assert.match(format('select * from go'), /FROM\n  go/);
		assert.match(format('select 1\ngo 5\nselect 2'), /^GO 5$/m);
	});

	test('preserves money literals', () => {
		const result = format('select $100.00, -£5 as x');
		assert.match(result, /\$100\.00/);
		assert.match(result, /-£5/);
	});

	test('preserves literal whitespace and mixed line endings', () => {
		const trailing = format("select 'a   \nb' as x from t");
		assert.match(trailing, /'a   \nb'/);

		const mixed = format("select 'a\nb' as x\r\nfrom t\r\n");
		assert.match(mixed, /'a\nb'/);
		assert.ok(!mixed.includes('\r\r\n'));
	});

	test('preserves ambiguous identifier casing', () => {
		const result = format('select Date, value, key, action, source, target from t');
		assert.match(result, /Date/);
		assert.match(result, /value/);
		assert.match(result, /key/);
		assert.match(result, /action/);
		assert.match(result, /source/);
		assert.match(result, /target/);
	});

	test('rejects selections inside literals and comments', () => {
		assert.strictEqual(isSelectionSafe("SELECT 'abc' AS x", 8, 10), false);
		assert.strictEqual(isSelectionSafe("SELECT 'abc' AS x", 7, 12), true);
		assert.strictEqual(isSelectionSafe('SELECT 1 -- comment', 12, 14), false);
	});
});
