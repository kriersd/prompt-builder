import express from 'express'
import helmet  from 'helmet'
import cors    from 'cors'
import morgan  from 'morgan'
import { fileURLToPath } from 'url'
import { dirname, join }  from 'path'

import promptRoutes   from './routes/prompts.js'
import templateRoutes from './routes/templates.js'
import aiRoutes       from './routes/ai.js'
import { errorHandler } from './middleware/errorHandler.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function createApp() {
  const app = express()
  const isProduction = process.env.NODE_ENV === 'production'
  const allowedCorsOrigins = process.env.CORS_ORIGIN
    ?.split(',')
    .map(origin => origin.trim())
    .filter(Boolean)

  // ── Security & utilities ──────────────────────────────────────────────────
  app.disable('x-powered-by')
  app.set('trust proxy', process.env.TRUST_PROXY === 'true')
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }))
  if (allowedCorsOrigins?.length) {
    app.use(cors({
      origin(origin, callback) {
        if (!origin || allowedCorsOrigins.includes(origin)) {
          return callback(null, true)
        }
        return callback(new Error('Origin not allowed by CORS'))
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    }))
  }
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
  app.use(express.json({ limit: '1mb', strict: true }))

  // ── Static frontend ───────────────────────────────────────────────────────
  app.use(express.static(join(__dirname, '../public')))

  // ── API routes ────────────────────────────────────────────────────────────
  app.use('/api/prompts',   promptRoutes)
  app.use('/api/templates', templateRoutes)
  app.use('/api/ai',        aiRoutes)

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  )

  // ── SPA fallback (serve index.html for any unmatched GET) ─────────────────
  app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, '../public/index.html'))
  })

  app.use(errorHandler)

  if (isProduction && !process.env.APP_API_TOKEN) {
    console.warn('[security] APP_API_TOKEN is not set; write and AI routes will be unauthenticated.')
  }

  return app
}
