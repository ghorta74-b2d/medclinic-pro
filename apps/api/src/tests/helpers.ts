import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'

type RoutePlugin = (server: FastifyInstance, opts: object) => Promise<void>

/**
 * Minimal Fastify instance with a single route plugin.
 * Avoids loading the full buildServer() (all plugins + all routes).
 */
export async function createRouteServer(
  plugin: RoutePlugin,
  prefix: string
): Promise<FastifyInstance> {
  const server = Fastify({ logger: false })
  await server.register(plugin, { prefix })
  await server.ready()
  return server
}

/** Mock Supabase user returned by verifySupabaseToken */
export function mockSupabaseUser(role: string, clinicId = 'clinic-1') {
  return {
    id: 'test-user-id',
    user_metadata: { role, clinic_id: clinicId },
  }
}
