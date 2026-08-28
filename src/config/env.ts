import { z } from 'zod';

const EnvSchema = z.object({
  ZZJL_API_KEY: z.string().min(1, 'ZZJL_API_KEY 是必填环境变量'),
  ZZJL_API_BASE_URL: z
    .string()
    .url()
    .startsWith('https://', '仅允许 HTTPS')
    .default('https://openapi.zzjilu.com'),
  ZZJL_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  ZZJL_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function loadConfig(): EnvConfig {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`配置校验失败:\n${issues}`);
  }
  return result.data;
}
