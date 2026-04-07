/**
 * Vercel Serverless Function entry point for the Fastify API
 * All routes are proxied through here via vercel.json rewrites
 */
import { buildServer } from '../src/server.js'
import type { IncomingMessage, ServerResponse } from 'node:http'

// Cache the Fastify instance across warm invocations (reduces cold start time)
let appPromise: Promise<Awaited<ReturnType<typeof buildServer>>> | null = null

function getApp() {
  if (!appPromise) {
    appPromise = buildServer().then(async (app) => {
      await app.ready()
      return app
    }).catch((err) => {
      console.error('Failed to initialize Fastify:', err)
      appPromise = null
      throw err
    })
  }
  return appPromise
}

// Pre-warm on first load to reduce latency on first real request
getApp()

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp()
    app.server.emit('request', req, res)
  } catch (err) {
    console.error('Handler error:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
}
