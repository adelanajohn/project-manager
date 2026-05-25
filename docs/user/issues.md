# Issues

Issues are the core building block of all work in your projects. Every task, bug, feature request, or user story is an issue.

## Issue Types

| Type | Icon | When to use |
|------|------|-------------|
| **Epic** | 🟣 | Large bodies of work spanning multiple sprints (e.g., "User authentication system") |
| **Story** | 🟢 | User-facing features described from the user's perspective |
| **Task** | 🔵 | Technical work items, not necessarily user-facing |
| **Bug** | 🔴 | Something that is broken and needs fixing |
| **Subtask** | ⚪ | A smaller piece of work inside a parent story, task, or bug |

Subtasks are nested under their parent — they appear in the parent issue's detail panel and can be individually assigned and tracked.

## Creating Issues

### Quick create

Press **C** from anywhere in the app to open the quick-create dialog. Enter a title, optionally set the type, priority, and assignee, then press **Enter** or click **Create**.

### Full create

Click **+ Create issue** in the toolbar. The full form lets you set all fields including description, sprint, epic, milestone, labels, and estimate.

### From the board

Click **+** at the bottom of any status column to create an issue directly in that status.

### From a parent issue

Open an issue and scroll to the **Subtasks** section. Click **Add subtask** to create a child issue linked to the current issue.

## Priority Levels

| Priority | Meaning |
|----------|---------|
| 🔴 **Urgent** | Drop everything; production-impacting or customer-blocking |
| 🟠 **High** | Important; should be addressed in the current sprint |
| 🟡 **Medium** | Standard priority (default for new issues) |
| 🔵 **Low** | Nice-to-have; defer if sprint is full |
| ⚪ **None** | Unprioritised; triage needed |

## Rich Text Editor

Issue descriptions and comments use a rich text editor with the following formatting options:

| Shortcut | Format |
|----------|--------|
| `**text**` | **Bold** |
| `*text*` | *Italic* |
| `~~text~~` | ~~Strikethrough~~ |
| `` `code` `` | `Inline code` |
| `# Heading 1` | Large heading |
| `## Heading 2` | Medium heading |
| `- item` | Bullet list |
| `1. item` | Numbered list |
| `[ ] item` | Checklist item |
| ` ``` ` | Code block |
| `> text` | Blockquote |

You can also use the toolbar that appears above the editor to apply formatting with clicks.

### Mentions

Type `@` to mention a team member. They will receive a notification.

### File embeds

Paste an image directly into the editor or drag and drop a file to attach it. Supported formats: PNG, JPG, GIF, PDF, and common document types.

## Linking Issues

You can create typed relationships between issues. Open the issue detail and click **Add link**:

| Link type | Meaning |
|-----------|---------|
| **Blocks** | This issue must be completed before the linked issue can start |
| **Is blocked by** | This issue cannot start until the linked issue is done |
| **Duplicates** | This issue is a duplicate of another |
| **Relates to** | General relationship for reference |

Linked issues appear in the **Linked Issues** section of the detail panel. A blocked issue shows a warning indicator on the board.

## Attachments

Click **Attach file** in the issue detail to upload files from your computer. Files are stored securely in S3. Maximum file size is 25 MB per attachment.

To delete an attachment, hover over it and click the trash icon (you must be the uploader, or an admin/manager).

## Bulk Actions

Select multiple issues on the Issues page by clicking the checkbox on the left of each row (or click the header checkbox to select all visible issues). Available bulk actions:

- **Change status** — move all selected issues to a new status
- **Change priority** — update priority for all selected
- **Assign to** — assign all to a team member
- **Move to sprint** — add all selected issues to a sprint
- **Add labels** — apply a label to all selected
- **Delete** — soft-delete all selected (admin/manager only)

Bulk actions appear in a floating toolbar at the bottom of the screen when any issues are selected.
