# Changelog

## [3.1.1] - 2026-10-18

### Fixed

- Keep the existing Marketplace display name `sql-formatter-plus` so the update can be published under `MuhammadBadar.sql-formatter-plus`.
- Updated development dependencies to resolve reported npm advisories.

## [3.1.0] - 2026-10-18

### Added

- Selection formatting while leaving the rest of the document untouched.
- Broad T-SQL support for CTEs, joins and `APPLY`, `MERGE`, DDL, triggers, `TRY`/`CATCH`, `CASE`, window functions, `GO` batches, and SQLCMD lines.
- Editor tab-size aware indentation.
- Unit and integration coverage for formatting behavior and selection safety.

### Fixed

- Preserve string literals, comments, bracketed identifiers, money literals, BOMs, and mixed line endings.
- Avoid synthesizing `--` comments from adjacent operators.
- Treat `GO` as a batch separator only when it appears alone on a line.
- Preserve ambiguous identifier casing such as `Date`, `value`, `key`, and `target`.
- Improve performance on long single-line SQL and large inline lists.

## [3.0.2]

- Previous public release.
