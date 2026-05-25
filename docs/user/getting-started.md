# Getting Started

Welcome to the project management app. This guide walks you through getting set up from scratch.

## 1. Create Your Account

1. Go to the sign-up page and enter your full name, email address, and a strong password
2. Click **Create account**
3. Check your email for a verification message — you need to verify your email before you can create an organisation

> Your password must be at least 8 characters. Use a mix of letters, numbers, and symbols for a stronger password.

## 2. Verify Your Email

Open the verification email and click **Verify Email**. This link is valid for 24 hours. If it expires, sign in and request a new one from your account settings.

## 3. Create Your First Organisation

An organisation (org) is the top-level workspace that contains your projects, members, and settings. Think of it as your company or team workspace.

1. After verifying your email, you'll be prompted to create an org
2. Enter your organisation name (e.g., "Acme Engineering")
3. Click **Create organisation**

You are automatically the **admin** of the org you create. Admins can invite members, manage billing, and configure settings.

## 4. Invite Team Members

1. In the left sidebar, click your org name, then **Settings → Members**
2. Click **Invite member**
3. Enter their email address and select a role:
   - **Admin** — full access including billing and member management
   - **Manager** — can manage projects, sprints, and all issues
   - **Member** — can create and work on issues (most common)
   - **Viewer** — read-only access to issues and analytics
   - **Guest** — limited to a specific project
4. Click **Send invite**

Invitees receive an email with a link to join. Pending invites appear in the Members list until accepted.

## 5. Create Your First Project

Projects organise work within an org. Each project has its own board, backlog, sprints, and settings.

1. In the left sidebar, click **+ New Project**
2. Enter a project name (e.g., "Mobile App")
3. Choose a **type**:
   - **Scrum** — for teams using sprints and a backlog
   - **Kanban** — for continuous flow with no sprints
4. Enter an **identifier** — a short uppercase code like `MOB` or `ENG`. This becomes the prefix for issue keys (e.g., `MOB-1`, `MOB-2`)
5. Click **Create project**

## 6. Create Your First Issue

Issues are the basic unit of work. They can be tasks, bugs, stories, or epics.

1. Click **Create issue** in the top toolbar, or press **C** from anywhere in the app
2. Enter a title describing the work (e.g., "Fix login timeout on mobile")
3. Set the **type** (Bug), **priority** (High), and optionally assign it to a team member
4. Click **Create** to save

Your issue is created in the project backlog with a key like `MOB-1`.

## 7. UI Tour

### Left Sidebar

- **Org switcher** — click your org name to switch between orgs or create a new one
- **Projects** — list of projects in the current org; click to open
- **Notifications** — bell icon shows unread notifications
- **Settings** — org settings, members, billing

### Inside a Project

| Section | Description |
|---------|-------------|
| **Board** | Kanban board showing issues in each workflow status |
| **Backlog** | Full list of issues not in a sprint |
| **Sprints** | Plan and manage sprints (Scrum only) |
| **Roadmap** | Timeline view of epics and milestones |
| **Issues** | Filterable table of all issues |
| **Docs** | Wiki-style documentation pages |
| **Settings** | Project configuration, statuses, labels, members |

### Command Palette

Press **Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux) to open the command palette. From here you can:
- Search issues, projects, and members
- Create a new issue
- Navigate to any page
- Change your theme

### Issue Detail

Click any issue to open the detail panel on the right side of the screen. From here you can:
- Edit the title and description
- Change status, priority, assignee, sprint, and epic
- Add comments
- Log time
- Attach files
- Link related issues
