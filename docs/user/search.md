# Search

## Global Search (Cmd+K)

Press **Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux) from anywhere in the app to open the command palette. You can also click the search bar in the top header.

### What you can search

| Type | Examples |
|------|---------|
| **Issues** | By title (`login bug`), by key (`ENG-42`) |
| **Docs** | By page title |
| **Members** | By name or email |

Type at least 2 characters to start seeing results.

### Keyboard navigation

- `↑` / `↓` — move through results
- `Enter` — open the selected result
- `Esc` — close the palette without navigating

### Filtering by type

Results are grouped by type (Issues, Docs, Members). The search automatically queries all types simultaneously. You cannot currently filter to a specific type in the command palette — use the Issues list page for more advanced filtering.

## Issue List Search and Filters

The **Issues** page inside a project has more powerful filtering:

- **Text search** — filters by title as you type
- **Status** — filter by one or more statuses
- **Priority** — filter by priority level
- **Assignee** — show only issues assigned to a specific person
- **Type** — filter to bugs, stories, tasks, etc.
- **Sprint** — filter to a specific sprint or unassigned
- **Epic** — filter to a specific epic
- **Label** — filter by one or more labels
- **Due date** — filter by overdue, due this week, etc.

Filters can be combined. The active filter count is shown in the filter bar.

### Saved Filters

Click **Save filter** to save the current filter combination as a preset with a name. Saved filters are per-user and per-project. They appear in the filter bar as quick-access buttons.

## Full-Text Search

The app uses PostgreSQL `pg_trgm` (trigram matching) for fast partial-word search across issue titles and doc titles.

For example, searching `auth` will match:
- "Add authentication middleware"
- "OAuth integration"  
- "Unauthorised access bug"

> Trigram search requires at least 3 consecutive characters to produce results.

## Search API

The search endpoint is available at:

```
GET /api/v1/search?q=<query>&type=<issue|doc|member>&projectId=<optional>
```

See `docs/api/README.md` for authentication and usage details.
