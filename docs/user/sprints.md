# Sprints

## What Is a Sprint?

A sprint is a time-boxed period (usually 1–4 weeks) during which your team commits to completing a set of issues. Sprints are a core concept of the Scrum framework and are available for projects configured as **Scrum** type.

At the start of a sprint, the team selects issues from the backlog and commits to completing them. At the end, the team reviews what was done (sprint review) and reflects on the process (retrospective), then starts the cycle again.

## Creating a Sprint

1. Open your project and navigate to **Sprints** or **Backlog**
2. Click **+ Create sprint**
3. Enter a sprint name (e.g., "Sprint 12") and optionally a goal — a one-sentence statement of what the team aims to achieve
4. Set the start and end dates
5. Click **Create sprint**

The new sprint appears at the top of the sprint list with status **Planned**.

### Adding Issues to a Sprint

- **From the backlog:** Drag issues from the backlog section up into the sprint, or right-click and select **Add to sprint**
- **From an issue:** Open the issue and use the **Sprint** field to select the sprint
- **Bulk add:** Select multiple issues in the backlog and use the bulk action **Move to sprint**

## Starting a Sprint

When your team is ready to begin, click **Start sprint** on the sprint card.

You must have at least one issue in the sprint to start it. Only one sprint per project can be active at a time.

Starting a sprint:
- Changes the sprint status to **Active**
- Sets the `startDate` to now (if not already set)
- Moves sprint issues to the active board view

## Completing a Sprint

Click **Complete sprint** when the sprint end date arrives (or earlier if the team finishes early). This opens the **Sprint Completion Wizard**.

### Sprint Completion Wizard

The wizard guides you through what to do with unfinished issues:

1. **Review unfinished issues** — the wizard shows a list of issues that were in the sprint but are not in a "done" category status
2. **Choose what to do with each group:**
   - **Move to next sprint** — creates a new sprint and moves the issues there
   - **Move to backlog** — returns the issues to the backlog
   - **Keep in current sprint** — not recommended; the completed sprint becomes read-only
3. **Set the next sprint** (optional) — you can create or select the next sprint inline
4. **Click Complete** — confirms the sprint, sets `completedAt`, and executes the chosen issue moves

Completed sprints are read-only and remain visible in the Sprints section for historical reference.

## Burndown Chart

Each active or completed sprint has a **Burndown Chart** available in the Sprint detail view. The chart shows:

- **X axis** — calendar days of the sprint
- **Y axis** — story points (or issue count if estimates are not used)
- **Ideal burn line** — a straight line from total scope on day 1 to 0 on the last day
- **Actual burn line** — daily snapshot of remaining scope (incomplete issues in the sprint)

### Reading the burndown

- **Line above ideal** — the team is behind; work is being completed slower than expected or scope was added mid-sprint
- **Line below ideal** — the team is ahead of schedule
- **Flat sections** — no issues were completed on those days
- **Drops** — issues were moved to "done" status

### Scope changes

If issues are added to or removed from an active sprint, the burndown chart recalculates from the day of the change. A vertical line is drawn at the point of the scope change so you can distinguish planned velocity from added/removed scope.

### Using the burndown

Use the burndown chart in your daily standup to spot problems early:
- Three flat days in a row is a signal to investigate blockers
- A sudden upward spike means scope was added — this should be discussed in the sprint retrospective
