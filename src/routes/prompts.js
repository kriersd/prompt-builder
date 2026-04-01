import { Router } from 'express'
import { getDb } from '../db/index.js'
import { createRateLimit, requireApiToken } from '../middleware/apiSecurity.js'
import {
  validateIdParam,
  validateListQuery,
  validatePromptPayload,
} from '../validation/payloads.js'

const router = Router()
const mutateLimiter = createRateLimit({
  bucket: 'prompts:mutate',
  windowMs: 60_000,
  maxRequests: 30,
  message: 'Too many prompt changes. Please try again in a minute.',
})

// GET /api/prompts
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, sort } = validateListQuery(req.query)
    const col   = getDb().collection('prompts')
    const skip  = (page - 1) * limit
    const docs  = await col.find({}, {
      sort:  { createdAt: sort === 'asc' ? 1 : -1 },
      skip,
      limit,
    })
    const total = await col.countDocuments()
    res.json({ data: docs, pagination: { page, limit, total } })
  } catch (err) { next(err) }
})

// GET /api/prompts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = validateIdParam(req.params.id)
    const doc = await getDb().collection('prompts').findOne({ _id: id })
    if (!doc) return res.status(404).json({ error: 'Prompt not found' })
    res.json(doc)
  } catch (err) { next(err) }
})

// POST /api/prompts
router.post('/', requireApiToken, mutateLimiter, async (req, res, next) => {
  try {
    const col    = getDb().collection('prompts')
    const payload = validatePromptPayload(req.body)
    const result = await col.insertOne(payload)
    const doc    = await col.findOne({ _id: result.insertedId })
    res.status(201).json(doc)
  } catch (err) { next(err) }
})

// PUT /api/prompts/:id
router.put('/:id', requireApiToken, mutateLimiter, async (req, res, next) => {
  try {
    const id = validateIdParam(req.params.id)
    const col = getDb().collection('prompts')
    const existing = await col.findOne({ _id: id })
    if (!existing) return res.status(404).json({ error: 'Prompt not found' })

    const payload = validatePromptPayload(req.body, { partial: true })
    await col.updateOne({ _id: id }, { $set: payload })
    const updated = await col.findOne({ _id: id })
    res.json(updated)
  } catch (err) { next(err) }
})

// DELETE /api/prompts/:id
router.delete('/:id', requireApiToken, mutateLimiter, async (req, res, next) => {
  try {
    const id = validateIdParam(req.params.id)
    const result = await getDb().collection('prompts').deleteOne({ _id: id })
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Prompt not found' })
    res.json({ acknowledged: true })
  } catch (err) { next(err) }
})

export default router
