# Docs & Wiki

Each project has a built-in wiki for documentation, meeting notes, decision records, and any team knowledge.

## Page Tree

Docs are organised as a tree of pages visible in the left panel of the Docs section. Pages can be nested under parent pages to create a hierarchy.

- Click a page title to open it
- Click the `▸` arrow to expand/collapse a page's children
- Drag pages to reorder them or move them under a different parent

## Creating a Page

Click **+ New Page** in the docs sidebar or toolbar. Enter a title when prompted. The page is created immediately and opens in the editor.

To create a sub-page: open the parent page and click **+ New sub-page**, or drag an existing page onto another.

## The Block Editor

The editor uses a block-based model. Every line is a block. Supported block types:

| Block | How to insert |
|-------|---------------|
| Paragraph | Default — just type |
| Heading 1 | `/h1` or `# ` at the start of a line |
| Heading 2 | `/h2` or `## ` |
| Heading 3 | `/h3` or `### ` |
| Bullet list | `/bullet` or `- ` |
| Numbered list | `/numbered` or `1. ` |
| Checklist | `/checklist` or `[ ] ` |
| Code block | `/code` or ` ``` ` |
| Blockquote | `/quote` or `> ` |
| Divider | `/divider` or `---` |
| Callout | `/callout` |
| Table | `/table` |
| Image | `/image` or drag an image file in |

Press `/` to open the block picker at any time.

### Inline formatting

Select text to reveal the floating formatting toolbar:

- **Bold** — `Cmd/Ctrl+B`
- *Italic* — `Cmd/Ctrl+I`
- `Code` — `Cmd/Ctrl+Shift+C`
- [Link](https://example.com) — `Cmd/Ctrl+Shift+K`

### Issue mentions

Type `#ENG-42` (or any valid issue key) in a doc page. It renders as a linked badge showing the issue status. Click it to open the issue.

## Editing a Page

Click into the page content area to start editing. Changes are saved automatically as you type (auto-save with a 1-second debounce).

To rename a page: click the page title at the top and type a new name.

## Version History

Every time you save a page, the version number increments. To view the history:
1. Open the page
2. Click the `•••` menu → **Version history**
3. Browse previous versions and compare changes

You can restore any previous version by clicking **Restore this version**.

## Deleting a Page

Open the `•••` menu → **Delete page**. Deleted pages are soft-deleted (recoverable for 30 days via the API). Deleting a parent page deletes its children too.

## Full-Text Search

Doc page titles are indexed for search. Use **Cmd+K** and type to find pages by title. Full content search across all pages is available via the Issues → Docs search filter.

## Permissions

Docs follow the project membership permissions:
- **Viewers** can read all docs
- **Members** and above can create and edit docs
- **Admins** and **Managers** can delete any doc
