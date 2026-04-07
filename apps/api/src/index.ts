import 'dotenv/config'
import { buildServer } from './server.js'

const server = await buildServer()

const port = parseInt(process.env['PORT'] ?? '3001', 10)
const host = process.env['HOST'] ?? '0.0.0.0'

try {
  await server.listen({ port, host })
  console.log(`API running at http://${host}:${port}`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
