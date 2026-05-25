# Settings

Settings are split into two areas: **Organisation Settings** (shared workspace configuration) and **Project Settings** (per-project configuration).

## Organisation Settings

Access via the sidebar: **org name → Settings**, or navigate to `/:orgSlug/settings`.

### General

| Setting | Description |
|---------|-------------|
| **Organisation name** | The display name shown in the sidebar and emails |
| **Slug** | The URL-safe identifier used in all links (e.g., `acme` → `app.com/acme/...`). Changing the slug breaks existing bookmarks |
| **Logo** | Upload a square image (PNG/JPG, max 2 MB). Shown in the sidebar and invite emails |
| **Plan** | Your current subscription plan (view-only; manage billing separately) |

### Members

Manage who has access to your organisation.

| Action | Who can do it |
|--------|---------------|
| Invite member | Org admin |
| Change a member's role | Org admin |
| Remove a member | Org admin (cannot remove yourself if you are the last admin) |

**Pending invites** — invited members who have not yet accepted appear in a separate "Pending" section. You can resend or cancel a pending invite.

**Roles** — see [security/rbac.md](../security/rbac.md) for the full role permissions matrix.

### Security

Manage your active login sessions.

- **Active sessions** — list of devices/browsers where you are currently logged in, with the IP address and last activity time
- **Revoke a session** — click the revoke button to log out that device immediately (useful if you forgot to log out on a shared computer)
- **Revoke all other sessions** — logs out all sessions except the current one

**MFA** (Multi-Factor Authentication) scaffolding is in place (TOTP via `otplib`) but the UI is not yet exposed. It will be required for Platform Admin accounts in a future release.

### API Keys

Create personal API keys for integrations, scripts, or CI/CD pipelines.

1. Click **Generate new key**
2. Give it a name (e.g., "GitHub Actions CI")
3. Optionally set an expiry date
4. Copy the key — it is shown **only once** and cannot be retrieved later

To revoke a key, click the trash icon next to it in the key list.

API keys are passed as Bearer tokens: `Authorization: Bearer pmk_<key>`.

### Notifications

*(Planned — not yet implemented)*

Per-project notification preferences: choose between immediate notifications, daily digest, or off for each event type.

### Billing

*(Requires `STRIPE_SECRET_KEY` to be configured)*

View your current plan, upgrade or downgrade, view invoices, and update your payment method.

The billing portal is powered by Stripe Customer Portal.

## Project Settings

Access via the project sidebar: **Settings** icon at the bottom.

### General

| Setting | Description |
|---------|-------------|
| **Name** | Project display name |
| **Description** | Optional one-line description shown on the projects list |
| **Colour** | Accent colour for the project in the sidebar and roadmap |
| **Default assignee** | New issues created in this project are auto-assigned to this user |

### Statuses

Add, rename, reorder, and recategorise the workflow statuses for this project. See [projects.md](projects.md#custom-statuses) for details.

### Labels

Manage project-scoped labels. You can also create org-scoped labels in Org Settings → Labels that are available in all projects.

### Members

Add team members to this project and optionally set project-level role overrides:
- **Project Lead** — gains sprint management and settings access within this project
- **Project Viewer** — read-only access regardless of org role

### Integrations

*(Planned — not yet implemented)*

Configure GitHub/GitLab repository links, Slack webhooks, and other integrations.

### Danger Zone

| Action | Effect |
|--------|--------|
| **Archive project** | Hides from sidebar; no new issues can be created; existing data preserved |
| **Delete project** | Permanently deletes the project and all its issues, sprints, and docs |
