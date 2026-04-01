import { Router } from 'express'
import { generatePromptStream, enhanceTask } from '../services/aiService.js'
import { createRateLimit, requireApiToken } from '../middleware/apiSecurity.js'
import { validateAiGeneratePayload, validateEnhancePayload } from '../validation/payloads.js'

const router = Router()
const aiLimiter = createRateLimit({
  bucket: 'ai',
  windowMs: 60_000,
  maxRequests: 10,
  message: 'AI rate limit exceeded. Please wait a minute before trying again.',
})

/**
 * POST /api/ai/generate
 * Streams the generated prompt back as Server-Sent Events.
 *
 * Events:
 *   data: {"type":"delta","text":"..."}        — incremental token
 *   data: {"type":"complete","generatedPrompt":"...","qualityScore":94,"qualityMetrics":{...}}
 *   data: [DONE]
 */
router.post('/generate', requireApiToken, aiLimiter, async (req, res, next) => {
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.flushHeaders()

  const send = data => res.write(`data: ${JSON.stringify(data)}\n\n`)

  try {
    const payload = validateAiGeneratePayload(req.body)
    await generatePromptStream(payload, send)
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    const status = err.status ?? 500
    send({ type: 'error', message: status >= 500 ? 'Unable to generate prompt right now.' : err.message })
    res.end()
  }
})

/**
 * POST /api/ai/enhance
 * Body: { taskDescription: string }
 * Returns: { enhanced: string }
 */
router.post('/enhance', requireApiToken, aiLimiter, async (req, res, next) => {
  try {
    const { taskDescription } = validateEnhancePayload(req.body)
    const enhanced = await enhanceTask(taskDescription)
    res.json({ enhanced })
  } catch (err) { next(err) }
})

export default router
