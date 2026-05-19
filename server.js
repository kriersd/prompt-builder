import 'dotenv/config'
import { createApp }  from './src/app.js'
import { connectDb }  from './src/db/index.js'
import { seedTemplates } from './seeds/templates.js'
import { seedRoles }     from './seeds/roles.js'

const PORT = process.env.PORT || 3000

async function start() {
  await connectDb()
  await seedTemplates()
  await seedRoles()

  const app = createApp()
  app.listen(PORT, () => {
    console.log(`[server] PromptForge running at http://localhost:${PORT}`)
  })
}

start().catch(err => {
  console.error('[server] Fatal startup error:', err)
  process.exit(1)
})
