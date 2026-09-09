const asBoolean = (value: unknown, fallback: boolean): boolean => {
  if (value === undefined || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

const asPositiveInteger = (value: unknown, fallback: number): number => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const jwtDuration = (value: unknown) => {
  const raw = String(value ?? '7d').trim().toLowerCase();
  const match = /^(\d+)(s|m|h|d|w)$/.exec(raw);
  if (!match) {
    throw new Error('JWT_EXPIRES_IN must use a positive duration such as 30m, 12h, or 7d');
  }

  const multipliers = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  } as const;
  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof multipliers;
  const milliseconds = amount * multipliers[unit];
  const maximumMilliseconds = 365 * multipliers.d;

  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0 || milliseconds > maximumMilliseconds) {
    throw new Error('JWT_EXPIRES_IN must be greater than zero and no longer than 365 days');
  }

  return { value: `${amount}${unit}`, milliseconds };
};

export function validateEnvironment(input: Record<string, unknown>) {
  const nodeEnv = String(input.NODE_ENV ?? 'development');
  const jwtSecret = String(input.JWT_SECRET ?? 'development-only-change-me');
  const sessionDuration = jwtDuration(input.JWT_EXPIRES_IN);

  if (nodeEnv === 'production' && Buffer.byteLength(jwtSecret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes in production');
  }

  const stripeSecretKey = String(input.STRIPE_SECRET_KEY ?? '');
  if (stripeSecretKey && !stripeSecretKey.startsWith('sk_test_')) {
    throw new Error('STRIPE_SECRET_KEY must be a Stripe test-mode secret key (sk_test_...)');
  }

  const currency = String(input.CURRENCY ?? 'usd').toLowerCase();
  if (currency !== 'usd') {
    throw new Error('Cartly currently supports CURRENCY=usd only');
  }

  return {
    ...input,
    NODE_ENV: nodeEnv,
    PORT: asPositiveInteger(input.PORT, 3000),
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: sessionDuration.value,
    JWT_COOKIE_MAX_AGE_MS: sessionDuration.milliseconds,
    FRONTEND_URL: String(input.FRONTEND_URL ?? 'http://localhost:5173'),
    COOKIE_SECURE: asBoolean(input.COOKIE_SECURE, nodeEnv === 'production'),
    MINIO_ENDPOINT: String(input.MINIO_ENDPOINT ?? 'localhost'),
    MINIO_PORT: asPositiveInteger(input.MINIO_PORT, 9000),
    MINIO_USE_SSL: asBoolean(input.MINIO_USE_SSL ?? input.USE_SSL, false),
    MINIO_ACCESS_KEY: String(input.MINIO_ACCESS_KEY ?? 'minioadmin'),
    MINIO_SECRET_KEY: String(input.MINIO_SECRET_KEY ?? 'minioadmin'),
    MINIO_BUCKET: String(input.MINIO_BUCKET ?? 'cartly-products'),
    MINIO_REGION: String(input.MINIO_REGION ?? 'us-east-1'),
    MAX_IMAGE_SIZE_BYTES: asPositiveInteger(input.MAX_IMAGE_SIZE_BYTES, 5 * 1024 * 1024),
    CURRENCY: currency,
    STRIPE_SECRET_KEY: stripeSecretKey,
    STRIPE_WEBHOOK_SECRET: String(input.STRIPE_WEBHOOK_SECRET ?? ''),
    STRIPE_SUCCESS_URL: String(
      input.STRIPE_SUCCESS_URL ?? 'http://localhost:5173/checkout/success?session_id={CHECKOUT_SESSION_ID}',
    ),
    STRIPE_CANCEL_URL: String(
      input.STRIPE_CANCEL_URL ?? 'http://localhost:5173/cart?checkout=cancelled',
    ),
  };
}
