# Projects

## Project Types

When creating a project you choose between **Scrum** and **Kanban**.

| | Scrum | Kanban |
|--|-------|--------|
| **Best for** | Teams that work in time-boxed iterations | Teams with continuous, flow-based work |
| **Backlog** | ✅ | ✅ |
| **Sprints** | ✅ Required | ❌ |
| **Board** | Sprint-scoped | Full backlog on board |
| **Burndown charts** | ✅ | ❌ |
| **Velocity** | ✅ | ❌ |

You can change a project from Scrum to Kanban in Settings → Project (existing sprints become read-only).

## Creating a Project

1. In the sidebar, click **+ New Project** (or go to your org dashboard → **Projects → New**)
2. Enter a **name** (e.g., "Mobile App")
3. Choose a **type** (Scrum or Kanban)
4. Enter an **identifier** — a 2–10 character uppercase code (e.g., `MOB`, `ENG`, `API`). This becomes the prefix for all issue keys in this project (`MOB-1`, `MOB-2`)
5. Pick a **colour** — used to identify the project in the sidebar and roadmap
6. Click **Create project**

Default workflow statuses are created automatically: Backlog, Todo, In Progress, In Review, Done, Canceled.

## Configuring a Project

### Custom Statuses

Go to **Settings → Statuses** inside the project.

Each status has:
- **Name** — what appears on the board and in dropdowns
- **Colour** — the colour dot/badge
- **Category** — maps to one of five built-in categories that drive analytics:
  - `backlog` — issues not yet started (excluded from sprint burndown)
  - `todo` — ready to start
  - `in_progress` — actively being worked on
  - `done` — completed; counted in velocity and burndown
  - `canceled` — abandoned; not counted in velocity

You can drag statuses to reorder them, which changes the board column order.

### Labels

Go to **Settings → Labels**. Labels are coloured tags you can add to issues for filtering.

Labels can be **org-scoped** (available in all projects) or **project-scoped** (available in one project only).

### Members

Go to **Settings → Members** to add or remove project members and set project-level roles:
- **Project Lead** — gains sprint management and project settings access on top of their org role
- **Viewer** — restricts a member to read-only access within this project regardless of org role

### Default Assignee

Set a default assignee in **Settings → General**. New issues created in this project are automatically assigned to this person.

## Archiving and Restoring Projects

Archived projects are hidden from the sidebar and cannot receive new issues.

To archive: **Settings → Danger Zone → Archive project**

To restore: go to **Org Settings → Projects**, find the archived project, and click **Restore**.

Issues in archived projects remain searchable and viewable but cannot be edited.

## Project Settings Overview

| Section | What you can configure |
|---------|----------------------|
| General | Name, description, colour, default assignee |
| Statuses | Add, rename, reorder, categorise workflow statuses |
| Labels | Project-scoped label management |
| Members | Add/remove project members, set project-level roles |
| Danger Zone | Archive or delete the project |
