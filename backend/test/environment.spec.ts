import { describe, expect, it } from 'vitest';
import { validateEnvironment } from '../src/config/environment';

describe('environment validation', () => {
  it('normalizes the JWT duration and derives the matching cookie lifetime', () => {
    const environment = validateEnvironment({ JWT_EXPIRES_IN: ' 12H ' });

    expect(environment.JWT_EXPIRES_IN).toBe('12h');
    expect(environment.JWT_COOKIE_MAX_AGE_MS).toBe(12 * 60 * 60 * 1_000);
  });

  it.each(['3600', '0s', '-1h', '366d', 'forever'])('rejects an unsafe JWT duration: %s', (duration) => {
    expect(() => validateEnvironment({ JWT_EXPIRES_IN: duration })).toThrow(/JWT_EXPIRES_IN/);
  });

  it('requires a strong JWT secret in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_SECRET: 'too-short',
      }),
    ).toThrow('JWT_SECRET must contain at least 32 bytes in production');

    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_SECRET: 'a-secure-local-secret-with-32-bytes',
      }),
    ).not.toThrow();
  });
});
