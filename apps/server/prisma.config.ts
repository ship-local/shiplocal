import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Prisma client generation runs in CI during `pnpm install`.
    // For `prisma generate`, Prisma only needs a syntactically valid URL.
    // Runtime connections are still enforced by `apps/server/src/db.ts`.
    url:
      process.env['DATABASE_URL'] ??
      env(
        'DATABASE_URL',
        'postgresql://shiplocal:shiplocal@localhost:5432/shiplocal?schema=public',
      ),
  },
});
