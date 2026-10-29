import { config } from '../../../config/env';

// Shared by the DEV ONLY scripts (promote:coach, seed:dev).

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

interface DatabaseTarget {
  hosts: string[];
  databaseName: string;
  isLocal: boolean;
}

// Parses host list and db name from a MongoDB URL without ever printing credentials.
export function describeDatabaseUrl(databaseUrl: string): DatabaseTarget {
  const withoutScheme = databaseUrl.replace(/^mongodb(\+srv)?:\/\//, '');
  const withoutCredentials = withoutScheme.includes('@')
    ? withoutScheme.slice(withoutScheme.lastIndexOf('@') + 1)
    : withoutScheme;
  const [hostPart, pathPart = ''] = withoutCredentials.split('/');
  const hosts = hostPart.split(',').map((host) => host.replace(/:\d+$/, ''));
  const databaseName = pathPart.split('?')[0] || '(default)';
  const isLocal = !databaseUrl.startsWith('mongodb+srv://') && hosts.every((host) => LOCAL_HOSTS.has(host));
  return { hosts, databaseName, isLocal };
}

/**
 * Exits the process unless this is a development run against a local database, or a
 * non-local one explicitly allowed with --allow-remote. Always prints the target.
 */
export function assertDevDatabase(allowRemote: boolean): void {
  if (config.nodeEnv === 'production') {
    console.error('Refusing to run: NODE_ENV is "production". This script is for development only.');
    process.exit(1);
  }

  if (!config.databaseUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const target = describeDatabaseUrl(config.databaseUrl);
  console.log(`Database: ${target.hosts.join(', ')} / ${target.databaseName}`);

  if (!target.isLocal) {
    if (!allowRemote) {
      console.error(
        'Refusing to run: DATABASE_URL points to a non-local database.\n' +
          'If this is really your DEV database, re-run with --allow-remote.',
      );
      process.exit(1);
    }
    console.warn('WARNING: --allow-remote given — writing to a NON-LOCAL database. Never use this on production.');
  }
}

/**
 * For setup scripts that production needs too (seed:nutrition, migrate:food-bank — like create:admin):
 * prints the target (hosts + database name only, never credentials) and refuses a non-local database
 * unless --allow-remote was passed. No NODE_ENV check.
 */
export function assertSetupDatabase(allowRemote: boolean): void {
  if (!config.databaseUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  const target = describeDatabaseUrl(config.databaseUrl);
  console.log(`Database: ${target.hosts.join(', ')} / ${target.databaseName}`);
  if (!target.isLocal) {
    if (!allowRemote) {
      console.error('Refusing to run: DATABASE_URL points to a non-local database. Re-run with --allow-remote if you mean it.');
      process.exit(1);
    }
    console.warn('WARNING: --allow-remote given — using a NON-LOCAL database.');
  }
}
