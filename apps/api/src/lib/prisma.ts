import path from 'node:path'
import { PrismaClient } from '../../generated/index.js'

// After esbuild bundling, __dirname inside Prisma's generated code points to
// the bundle directory (/var/task/api/) instead of the original generated/
// directory. Override the binary path so Prisma can find the .so.node file
// that Vercel includes via vercel.json includeFiles: "generated/**".
// This must be set BEFORE new PrismaClient() is called.
if (!process.env['PRISMA_QUERY_ENGINE_LIBRARY']) {
  process.env['PRISMA_QUERY_ENGINE_LIBRARY'] = path.join(
    process.cwd(), // /var/task on Vercel serverless
    'generated',
    'libquery_engine-rhel-openssl-3.0.x.so.node'
  )
  console.log('[PRISMA] Engine path:', process.env['PRISMA_QUERY_ENGINE_LIBRARY'])
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
