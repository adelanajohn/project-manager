/**
 * Generate OpenAPI spec from running app.
 * Run: pnpm --filter @pm/api generate:openapi
 */
import { buildApp } from './app.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

async function main() {
  const app = await buildApp();
  await app.ready();

  const spec = app.swagger();

  const outDir = join(process.cwd(), '../../docs/api');
  mkdirSync(outDir, { recursive: true });

  writeFileSync(join(outDir, 'openapi.yaml'), yaml.dump(spec));
  console.log('✅ OpenAPI spec written to docs/api/openapi.yaml');

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
