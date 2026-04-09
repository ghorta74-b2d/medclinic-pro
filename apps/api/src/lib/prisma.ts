import path from 'node:path'
import { existsSync } from 'node:fs'
import { PrismaClient } from '../../generated/index.js'

// After esbuild bundling, __dirname inside Prisma's generated code points to
// the bundle directory (/var/task/api/) instead of the original generated/
// directory. Override the binary path so Prisma can find the .so.node file.
// Try both OpenSSL variants — Vercel Node 20 Lambda may use either 1.0.x or 3.0.x
// depending on the AL2 vs AL2023 Lambda environment.
if (!process.env['PRISMA_QUERY_ENGINE_LIBRARY']) {
  const base = process.cwd() // /var/task on Vercel serverless
  const candidates = [
    path.join(base, 'generated', 'libquery_engine-rhel-openssl-3.0.x.so.node'),
    path.join(base, 'generated', 'libquery_engine-rhel-openssl-1.0.x.so.node'),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      process.env['PRISMA_QUERY_ENGINE_LIBRARY'] = candidate
      console.log('[PRISMA] Engine path:', candidate)
      break
    }
  }
  if (!process.env['PRISMA_QUERY_ENGINE_LIBRARY']) {
    console.error('[PRISMA] No engine binary found in', path.join(base, 'generated'))
  }
}

// Singleton pattern for serverless — prevents connection pool exhaustion
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma
}
