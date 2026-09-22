import { version } from '@/package.json';

export type HealthStatus = 'ok' | 'degraded';

export type HealthChecks = {
  anthropicApiKeyConfigured: boolean;
};

export type Health = {
  status: HealthStatus;
  app: 'klaro';
  version: string;
  environment: string;
  checkedAt: string;
  checks: HealthChecks;
};

/**
 * Reports whether the app's own configuration is complete. Checks are booleans
 * only — never the secret values themselves, since this is served publicly.
 * No outbound calls: presence of a key is not proof it works, and a health
 * check that bills the Anthropic API is a health check nobody can poll.
 */
export function getHealth(): Health {
  const checks: HealthChecks = {
    anthropicApiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  };

  const status: HealthStatus = Object.values(checks).every(Boolean)
    ? 'ok'
    : 'degraded';

  return {
    status,
    app: 'klaro',
    version,
    environment: process.env.VERCEL_ENV ?? 'local',
    checkedAt: new Date().toISOString(),
    checks,
  };
}
