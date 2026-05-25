import { beforeAll, afterAll } from 'vitest';

// Set test environment variables before anything else
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://app_user:password@localhost:5432/pm_db_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// Generate test JWT keys if not provided
if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
  // Use well-known test keys (not for production)
  const TEST_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA2a2rwplBQLF29amygykEMmYz0+Kcj3bKBp29PNEvEBW7ANMF
TlDeDWJPFrm/UhHPIxBiN8VGJfPbOlpjxRUcHJ5e8Gx7LD6m8cCo1y8Ga8RmXe3
4i8z9FhVqRRFWQNjmJm7qLiXDLTUjCQy5qrE6/CHWV+uHoXe1R6a7V5XZ5mj7+Yt
Z3y9K8N8R7S5K6m5mU3ym+5J4Y7u8wFi8j5kZ8p6K0m9Z7kl3/y9F7qGp8i9q1U
-----END RSA PRIVATE KEY-----`;
  
  // Fall back to a simple HMAC approach in tests when no RS256 keys are set
  process.env.JWT_ALGORITHM = 'HS256';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-not-for-production';
}

process.env.PORT = '3001';
process.env.APP_URL = 'http://localhost:3001';
process.env.CORS_ORIGINS = 'http://localhost:5173';
