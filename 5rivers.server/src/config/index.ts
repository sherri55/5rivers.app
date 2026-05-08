import dotenv from 'dotenv';

dotenv.config();

function env(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) throw new Error(`Missing env: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',

  cors: {
    allowedOrigins:
      process.env.ALLOWED_ORIGINS?.split(',')
        .map((o) => o.trim())
        .filter(Boolean) ?? ['http://localhost:3000', 'http://localhost:5173'],
  },

  jwt: {
    secret: env('JWT_SECRET', 'default-secret-change-in-production'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  },

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  },

  /** When set, this email can log in to any org by slug (no membership required) and gets isSuperAdmin in JWT. */
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() || null,

  /** Static API key for agent/service access (no expiry). Set AGENT_API_KEY to enable. */
  agent: {
    apiKey: process.env.AGENT_API_KEY?.trim() || null,
    userId: process.env.AGENT_USER_ID?.trim() || null,
    organizationId: process.env.AGENT_ORG_ID?.trim() || null,
    email: process.env.AGENT_EMAIL?.trim() || 'agent@5rivers.local',
    role: process.env.AGENT_ROLE?.trim() || 'OWNER',
  },

  /** Normalized connection string from DATABASE_URL (required). */
  get databaseUrl(): string {
    let url = env('DATABASE_URL').trim();
    // SSMS-style: Data Source= → Server=, User ID= → User Id=
    url = url.replace(/^Data Source=/i, 'Server=').replace(/User ID=/gi, 'User Id=');
    // Strip SSMS-only options that break .env quoting or are unsupported by node-mssql
    url = url
      .replace(/Application Name="[^"]*";?/gi, '')
      .replace(/Command Timeout=\d+;?/gi, '')
      .replace(/Persist Security Info=True;?/gi, '')
      .replace(/Pooling=False;?/gi, '')
      .replace(/MultipleActiveResultSets=False;?/gi, '')
      .replace(/;+/g, ';')
      .replace(/^;|;$/g, '');
    const timeoutMs =
      process.env.DATABASE_CONNECTION_TIMEOUT ?? process.env.SQLSERVER_CONNECTION_TIMEOUT ?? '60000';
    const timeoutSec = Math.floor((parseInt(timeoutMs, 10) || 60000) / 1000);
    if (!/Connection Timeout=/i.test(url)) {
      url = `${url};Connection Timeout=${timeoutSec}`;
    }
    if (!/Database=/i.test(url)) {
      url = `${url};Database=5rivers`;
    }
    return url;
  },
};
