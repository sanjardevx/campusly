import { validateEnv } from './config';

const BASE = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  FRONTEND_URL: 'http://localhost:3001',
};

describe('validateEnv: AI tutor', () => {
  it('is off by default, with 20 requests a day', () => {
    const env = validateEnv(BASE);
    expect(env.TUTOR_PROVIDER).toBe('off');
    expect(env.TUTOR_DAILY_LIMIT).toBe(20);
    expect(env.ANTHROPIC_CHAT_MODEL_ID).toBe('claude-haiku-5-5');
  });

  it('refuses the Anthropic provider without an API key', () => {
    expect(() => validateEnv({ ...BASE, TUTOR_PROVIDER: 'anthropic' })).toThrow(
      /ANTHROPIC_API_KEY/,
    );
  });

  it('accepts the Anthropic provider with a key and a custom daily limit', () => {
    const env = validateEnv({
      ...BASE,
      TUTOR_PROVIDER: 'anthropic',
      ANTHROPIC_API_KEY: `sk-ant-api03-${'x'.repeat(40)}`,
      TUTOR_DAILY_LIMIT: '10',
    });
    expect(env.TUTOR_DAILY_LIMIT).toBe(10);
  });

  it('never allows the fake tutor in production', () => {
    expect(() =>
      validateEnv({ ...BASE, NODE_ENV: 'production', TUTOR_PROVIDER: 'fake' }),
    ).toThrow(/TUTOR_PROVIDER/);
  });
});
