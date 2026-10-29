import path from 'node:path';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';

// Setup scripts only (seed:nutrition, migrate:food-bank, status:food-bank): `--env-file <path>` loads that
// file INSTEAD of .env — nothing falls back to the dev .env, so a key missing there stays missing.
// Import this module FIRST (before anything that reads config/env). Never prints a value.
const index = process.argv.indexOf('--env-file');
if (index >= 0) {
  const file = process.argv[index + 1] ? path.resolve(process.argv[index + 1]) : '';
  if (!file || !existsSync(file)) {
    console.error('--env-file: no such file.');
    process.exit(1);
  }
  dotenv.config({ path: file, override: true, quiet: true });
  process.env.SISTEM_ENV_FILE = path.basename(file);
}
