-- ============================================================
-- Row-Level Security Policies
-- Run AFTER prisma migrate deploy
-- Uses app.current_org_id and app.current_user_id session vars
-- set by Prisma middleware on every transaction.
-- ============================================================

-- Helper: safe setting getter that returns NULL if unset
CREATE OR REPLACE FUNCTION current_org_id() RETURNS uuid AS $$
BEGIN
  RETURN nullif(current_setting('app.current_org_id', true), '')::uuid;
EXCEPTION WHEN others THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_user_id() RETURNS uuid AS $$
BEGIN
  RETURN nullif(current_setting('app.current_user_id', true), '')::uuid;
EXCEPTION WHEN others THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS text AS $$
BEGIN
  RETURN nullif(current_setting('app.current_role', true), '');
EXCEPTION WHEN others THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── Organizations ──────────────────────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orgs_select ON organizations;
CREATE POLICY orgs_select ON organizations FOR SELECT
  USING (
    id = current_org_id()
    OR EXISTS (
      SELECT 1 FROM org_members
      WHERE org_id = organizations.id
      AND user_id = current_user_id()
    )
  );

DROP POLICY IF EXISTS orgs_modify ON organizations;
CREATE POLICY orgs_modify ON organizations FOR ALL
  USING (id = current_org_id());

-- ── Projects ───────────────────────────────────────────────────────────────
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_isolation ON projects;
CREATE POLICY projects_isolation ON projects
  USING (org_id = current_org_id());

-- ── Issues ─────────────────────────────────────────────────────────────────
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS issues_select ON issues;
CREATE POLICY issues_select ON issues FOR SELECT
  USING (org_id = current_org_id());

DROP POLICY IF EXISTS issues_insert ON issues;
CREATE POLICY issues_insert ON issues FOR INSERT
  WITH CHECK (org_id = current_org_id());

DROP POLICY IF EXISTS issues_update ON issues;
CREATE POLICY issues_update ON issues FOR UPDATE
  USING (
    org_id = current_org_id()
    AND (
      reporter_id = current_user_id()
      OR assignee_id = current_user_id()
      OR current_user_role() IN ('tenant_admin', 'tenant_manager')
    )
  );

DROP POLICY IF EXISTS issues_delete ON issues;
CREATE POLICY issues_delete ON issues FOR DELETE
  USING (
    org_id = current_org_id()
    AND (
      reporter_id = current_user_id()
      OR current_user_role() IN ('tenant_admin', 'tenant_manager')
    )
  );

-- ── Sprints ────────────────────────────────────────────────────────────────
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sprints_isolation ON sprints;
CREATE POLICY sprints_isolation ON sprints
  USING (org_id = current_org_id());

-- ── Epics ──────────────────────────────────────────────────────────────────
ALTER TABLE epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE epics FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS epics_isolation ON epics;
CREATE POLICY epics_isolation ON epics
  USING (org_id = current_org_id());

-- ── Comments ───────────────────────────────────────────────────────────────
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comments_select ON comments;
CREATE POLICY comments_select ON comments FOR SELECT
  USING (org_id = current_org_id());

DROP POLICY IF EXISTS comments_insert ON comments;
CREATE POLICY comments_insert ON comments FOR INSERT
  WITH CHECK (org_id = current_org_id());

DROP POLICY IF EXISTS comments_update ON comments;
CREATE POLICY comments_update ON comments FOR UPDATE
  USING (
    org_id = current_org_id()
    AND (
      author_id = current_user_id()
      OR current_user_role() IN ('tenant_admin', 'tenant_manager')
    )
  );

-- ── Docs ───────────────────────────────────────────────────────────────────
ALTER TABLE docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS docs_isolation ON docs;
CREATE POLICY docs_isolation ON docs
  USING (org_id = current_org_id());

-- ── Notifications ──────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_own ON notifications;
CREATE POLICY notifications_own ON notifications
  USING (
    org_id = current_org_id()
    AND user_id = current_user_id()
  );

-- ── Org Members ────────────────────────────────────────────────────────────
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_members_select ON org_members;
CREATE POLICY org_members_select ON org_members FOR SELECT
  USING (org_id = current_org_id());

DROP POLICY IF EXISTS org_members_modify ON org_members;
CREATE POLICY org_members_modify ON org_members FOR ALL
  USING (
    org_id = current_org_id()
    AND current_user_role() IN ('tenant_admin')
  );

-- ── Labels ─────────────────────────────────────────────────────────────────
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS labels_isolation ON labels;
CREATE POLICY labels_isolation ON labels
  USING (org_id = current_org_id());

-- ── Attachments ────────────────────────────────────────────────────────────
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attachments_isolation ON attachments;
CREATE POLICY attachments_isolation ON attachments
  USING (org_id = current_org_id());

-- ── Audit Logs ─────────────────────────────────────────────────────────────
-- Append-only: admins can read, no deletes
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_select ON audit_logs;
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT
  USING (
    org_id = current_org_id()
    AND current_user_role() IN ('tenant_admin', 'tenant_manager')
  );

DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT
  WITH CHECK (true); -- workers write without org context

-- Prevent deletes on audit log
DROP POLICY IF EXISTS audit_logs_nodelete ON audit_logs;
CREATE POLICY audit_logs_nodelete ON audit_logs FOR DELETE
  USING (false);

-- ── Full-text search indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS issues_title_trgm_idx ON issues USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS docs_title_trgm_idx ON docs USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS issues_org_project_idx ON issues(org_id, project_id, deleted_at);
CREATE INDEX IF NOT EXISTS issues_assignee_idx ON issues(org_id, assignee_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, org_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS audit_logs_org_actor_idx ON audit_logs(org_id, actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_user_active_idx ON sessions(user_id, revoked_at) WHERE revoked_at IS NULL;
