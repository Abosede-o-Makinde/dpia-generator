-- ─────────────────────────────────────────────────────────────────────────────
-- Defence-in-depth: Postgres Row-Level Security for tenant-scoped tables.
--
-- The API already scopes every query by organisationId via a Prisma client
-- extension; RLS guarantees isolation even if application code regresses.
-- The API sets `SET LOCAL app.current_org` per transaction for tenant traffic.
-- Apply after `prisma migrate deploy`:  psql "$DATABASE_URL" -f prisma/rls.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Application role used by the API (never a superuser / table owner,
-- otherwise RLS is bypassed).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'shieldwise_app') THEN
    CREATE ROLE shieldwise_app LOGIN PASSWORD 'override-me';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO shieldwise_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO shieldwise_app;

-- Audit log is append-only for the app role.
REVOKE UPDATE, DELETE ON audit_logs FROM shieldwise_app;
REVOKE UPDATE, DELETE ON workflow_events FROM shieldwise_app;

-- Tenant-scoped tables carrying organisation_id ("organisationId" column).
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'departments', 'projects', 'memberships', 'dpias', 'risks', 'evidence',
    'connectors', 'ai_conversations', 'report_exports', 'api_tokens', 'audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING ("organisationId" = current_setting(''app.current_org'', true))
         WITH CHECK ("organisationId" = current_setting(''app.current_org'', true))',
      t
    );
  END LOOP;
END $$;

-- Controls: global rows (organisationId IS NULL) are readable by all tenants.
ALTER TABLE controls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON controls;
CREATE POLICY tenant_isolation ON controls
  USING ("organisationId" IS NULL OR "organisationId" = current_setting('app.current_org', true))
  WITH CHECK ("organisationId" = current_setting('app.current_org', true));
