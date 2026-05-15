import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(65535)).default(3000),

  DATABASE_TYPE: z.enum(['postgres', 'memory']).default('memory'),
  DATABASE_URL: z.string().optional(),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_PRETTY: z.string().transform((val) => val === 'true').default(false),

  OUTBOX_WORKER_INTERVAL: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1000)).default(5000),

}).refine((data) => {
  if (data.DATABASE_TYPE === 'postgres' && !data.DATABASE_URL) {
    return false;
  }
  return true;
}, {
  message: 'DATABASE_URL is required when DATABASE_TYPE is postgres',
  path: ['DATABASE_URL'],
});

export type Config = z.infer<typeof envSchema>;

function validateConfig(): Config {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map(i => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return result.data;
}

export const config: Config = validateConfig();

export function getDatabaseUrl(): string {
  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return config.DATABASE_URL;
}
