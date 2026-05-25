-- Create app_migration role with elevated privileges for migrations
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_migration') THEN
    CREATE ROLE app_migration LOGIN PASSWORD 'migration_password' SUPERUSER;
  END IF;
END
$$;

-- Create app_readonly role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_readonly') THEN
    CREATE ROLE app_readonly LOGIN PASSWORD 'readonly_password';
  END IF;
END
$$;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Grant privileges to app_user
GRANT ALL PRIVILEGES ON DATABASE pm_db TO app_user;
