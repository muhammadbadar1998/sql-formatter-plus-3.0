# SQL Formatter Plus

A T-SQL / SQL Server formatter for Visual Studio Code. It formats complete documents or the current selection while preserving string literals, comments, quoted identifiers, and T-SQL-specific syntax.

## What it formats

### Queries

- `SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `DISTINCT`, and `TOP`.
- `INNER`, `LEFT`, `RIGHT`, `FULL`, and `CROSS` joins, plus `CROSS APPLY` and `OUTER APPLY`.
- CTEs, recursive CTEs, subqueries, and derived tables.
- `UNION`, `UNION ALL`, `EXCEPT`, and `INTERSECT`.
- Window functions with `OVER`, `PARTITION BY`, `ORDER BY`, and frame clauses.
- `OFFSET` / `FETCH`, `FOR JSON`, `FOR XML`, and query hints.

### Statements and programmability

- `INSERT` / `VALUES`, `UPDATE` / `SET`, `DELETE`, and `MERGE`.
- `OUTPUT` clauses and table-valued constructors.
- `CREATE`, `ALTER`, `DROP`, and `TRUNCATE` for tables, views, procedures, functions, triggers, indexes, and constraints.
- `BEGIN` / `END`, `IF` / `ELSE`, `WHILE`, `TRY` / `CATCH`, transactions, `EXEC`, `PRINT`, `THROW`, `RAISERROR`, `RETURN`, and `GOTO`.

### Expressions and T-SQL syntax

- `CASE`, `BETWEEN`, `IN`, `EXISTS`, `CAST`, `CONVERT`, and `PIVOT` / `UNPIVOT`.
- Single-quoted and `N'Unicode'` strings, `"quoted"` identifiers, and `[bracketed]` identifiers.
- Line comments, block comments (including nested block comments), and money literals.
- `@variables`, `@@system_functions`, `#temp` tables, `$PARTITION`, and SQLCMD variables.
- SQLCMD lines such as `:setvar` and `:r`, plus `GO` batch separators.

## Formatting behavior

- Breaks major clauses onto their own lines and indents clause bodies.
- Formats comma-separated lists, joins, `ON` conditions, and `AND` / `OR` conditions.
- Indents `CASE`, `BEGIN` / `END`, `TRY` / `CATCH`, and nested subqueries.
- Formats the current selection when one exists; otherwise formats the whole document.
- Uses the editor's tab size for indentation.
- Uppercases recognized keywords while preserving ambiguous identifier casing such as `Date`, `value`, `key`, and `target`.
- Preserves CRLF/LF line endings, BOMs, money literals, and multi-line literal contents.
- Skips selections that start or end inside a literal, comment, or delimited identifier.
- Returns the original text unchanged if formatting fails.

## Examples

Examples use 2-space indentation. The actual output uses your editor's tab size.

### SELECT with a join

Before:

```sql
select u.id,u.name,count(o.id) as orders from dbo.Users u left join dbo.Orders o on o.user_id=u.id where u.active=1 group by u.id,u.name order by orders desc;
```

After:

```sql
SELECT
  u.id,
  u.name,
  count(o.id) AS orders
FROM
  dbo.Users u
  LEFT JOIN dbo.Orders o
    ON o.user_id = u.id
WHERE
  u.active = 1
GROUP BY
  u.id,
  u.name
ORDER BY
  orders DESC;
```

### CTE and subquery

Before:

```sql
with recent as (select id,user_id,total from dbo.Orders where created_at>=dateadd(day,-7,getdate())) select u.name,r.total from dbo.Users u join recent r on r.user_id=u.id where r.total>100 order by r.total desc;
```

After:

```sql
WITH recent AS (
  SELECT
    id,
    user_id,
    total
  FROM
    dbo.Orders
  WHERE
    created_at >= dateadd(day, -7, getdate())
)
SELECT
  u.name,
  r.total
FROM
  dbo.Users u
  JOIN recent r
    ON r.user_id = u.id
WHERE
  r.total > 100
ORDER BY
  r.total DESC;
```

### CREATE TABLE

Before:

```sql
create table dbo.Audit(id int identity(1,1) primary key,message nvarchar(200) not null,created_at datetime2 default sysdatetime());
```

After:

```sql
CREATE TABLE dbo.Audit (
  id INT IDENTITY(1, 1) PRIMARY KEY,
  message NVARCHAR(200) NOT NULL,
  created_at DATETIME2 DEFAULT sysdatetime()
);
```

## Usage

1. Install the extension from a `.vsix` file:
   - Open the Extensions view.
   - Select `...` > **Install from VSIX...**
   - Choose the packaged `sql-formatter-plus-3.1.1.vsix` file.
2. Open a `.sql` file.
3. Optionally select the SQL you want to format.
4. Run **sql-formatter-plus: Format SQL** from the Command Palette.

## Notes

- Formatting is syntax-aware but does not validate SQL semantics.
- String literals, comments, quoted identifiers, and bracketed identifiers are kept intact.
- The VS Code command uses uppercase keywords. Keyword casing is configurable through the formatter API.

## Development

```bash
npm install
npm test
npm run vsix
```

`npm test` compiles the extension and runs the unit and integration tests in a VS Code extension host. `npm run vsix` creates a packaged extension in the repository root.

## License

MIT
