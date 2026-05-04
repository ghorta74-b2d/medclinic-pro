import 'dotenv/config'
import './lib/env.js' // validate env vars at boot — exits with error if any are missing
import { buildServer } from './server.js'

void (async () => {
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
})()
