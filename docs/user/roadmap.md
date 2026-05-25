# Roadmap

The roadmap gives you a bird's-eye view of your project's epics, milestones, and sprints on a timeline.

## Epics and Milestones

### Epics

An epic is a large body of work that spans multiple sprints. Before you can use the roadmap, you need to create some epics and give them start and end dates.

To create an epic:
1. Open your project and go to **Roadmap**
2. Click **+ New Epic**
3. Enter a title and pick start/end dates
4. Click **Create**

### Milestones

Milestones mark significant dates — a release, a feature freeze, a demo. They appear as diamond markers on the Gantt timeline.

To create a milestone, go to your project **Settings → Milestones** (or use the API).

## Using the Gantt View

The roadmap renders as a Gantt chart — a horizontal timeline where each epic is a coloured bar.

### Timeline header

The header shows dates grouped by the current zoom level. A dashed red line marks today.

### Bars

Each bar represents an epic:
- The **bar length** reflects the epic's duration (start → end date)
- The **filled portion** shows how much of the work is done (based on issues in `done` status)
- The **bar colour** matches the epic's configured colour

Milestones are shown as diamond shapes on the day of their due date.

Sprints are shown as subtle grey bands across the full width, so you can see which epics fall within which sprints.

## Zoom Levels

Use the zoom controls in the top-right to change the time resolution:

| Level | Best for |
|-------|----------|
| **Day** | Short sprints, detailed scheduling |
| **Week** | 1–3 month planning windows |
| **Month** | Quarterly roadmaps *(default)* |
| **Quarter** | Annual planning, very long epics |

## Dragging to Reschedule

Click and drag a bar left or right to change the epic's start and end dates. Changes are saved automatically (with a short debounce to avoid excessive API calls).

You can also drag the right edge of a bar to extend only the end date.

## Collapsing and Expanding Rows

If an epic has child issues, click the expand arrow on the left to see them inline on the roadmap.

## Filtering

Use the filter bar to show only:
- Epics assigned to a specific team member
- Epics with a particular label
- A date range

Filters persist within your session but are not saved per-user yet.

## Exporting the Roadmap

Click the **Export** button (top-right) to download the roadmap as a PNG image. You can then embed it in presentations, Slack messages, or documentation.

> PDF export via browser print (Ctrl+P / Cmd+P) also works — the Gantt chart is print-optimised.
