/**
 * Vercel Serverless Function entry point for the Fastify API
 * All routes are proxied through here via vercel.json rewrites
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

console.log('[STARTUP] api/index.ts loading, Node:', process.version)

let appPromise: Promise<any> | null = null

function getApp() {
  if (!appPromise) {
    appPromise = import('../src/server.js').then(async ({ buildServer }) => {
      console.log('[STARTUP] buildServer imported')
      const app = await buildServer()
      await app.ready()
      console.log('[STARTUP] Fastify ready')
      return app
    }).catch((err) => {
      console.error('[STARTUP] Failed to initialize Fastify:', err)
      appPromise = null
      throw err
    })
  }
  return appPromise
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp()
    app.server.emit('request', req, res)
  } catch (err) {
    console.error('[HANDLER] Error:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error', message: String(err) }))
  }
}
