import dotenv from 'dotenv';

dotenv.config();

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) throw new Error(`Missing env: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  get databaseUrl(): string {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    const server = getEnv('SQLSERVER_SERVER', 'localhost');
    const port = process.env.SQLSERVER_PORT || '1433';
    const database = getEnv('SQLSERVER_DATABASE', 'FiveRivers');
    const user = getEnv('SQLSERVER_USER', 'sa');
    const password = getEnv('SQLSERVER_PASSWORD', '');
    const encrypt = process.env.SQLSERVER_ENCRYPT !== 'false';
    return `Server=${server},${port};Database=${database};User Id=${user};Password=${password};Encrypt=${encrypt};TrustServerCertificate=true`;
  },
};
