import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireStaff } from '../middleware/auth.js'

export async function catalogsRoutes(server: FastifyInstance) {
  /**
   * GET /api/catalogs/cie10?q=tuberculosis
   * Búsqueda en el catálogo CIE-10 SSA México.
   * Devuelve máximo 20 resultados — sin paginación (uso en autocomplete).
   */
  server.get('/cie10', { preHandler: requireStaff }, async (request, reply) => {
    const { q } = request.query as { q?: string }

    if (!q || q.trim().length < 2) {
      return reply.send({ data: [] })
    }

    const term = q.trim()

    // Búsqueda por código exacto primero (e.g. "A15"), luego por descripción
    const results = await prisma.cie10Code.findMany({
      where: {
        isActive: true,
        OR: [
          { code: { startsWith: term.toUpperCase() } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      },
      orderBy: [
        // Códigos que empiezan con el término van primero
        { code: 'asc' },
      ],
      take: 20,
      select: { code: true, description: true, chapter: true, block: true },
    })

    return reply.send({ data: results })
  })

  /**
   * GET /api/catalogs/cum?q=amoxicilina
   * Búsqueda en el Catálogo Universal de Medicamentos (COFEPRIS).
   * Reutiliza la tabla Medication — el endpoint de recetas sigue igual.
   */
  server.get('/cum', { preHandler: requireStaff }, async (request, reply) => {
    const { q } = request.query as { q?: string }

    if (!q || q.trim().length < 2) {
      return reply.send({ data: [] })
    }

    const results = await prisma.medication.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { brandName: { contains: q, mode: 'insensitive' } },
          { cumKey: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, brandName: true, presentation: true, concentration: true, cumKey: true, controlled: true },
    })

    return reply.send({ data: results })
  })
}
