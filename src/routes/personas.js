import { Router } from 'express'
import { getDb } from '../db/index.js'
import { createRateLimit, requireApiToken } from '../middleware/apiSecurity.js'
import { validatePersonaPayload, validateIdParam } from '../validation/payloads.js'

const router = Router()
const mutateLimiter = createRateLimit({
  bucket: 'personas:mutate',
  windowMs: 60_000,
  maxRequests: 30,
  message: 'Too many persona changes. Please try again in a minute.',
})

// GET /api/personas
router.get('/', async (req, res, next) => {
  try {
    const docs = await getDb().collection('personas').find({}, { sort: { name: 1 } })
    res.json({ data: docs })
  } catch (err) { next(err) }
})

// GET /api/personas/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id  = validateIdParam(req.params.id)
    const doc = await getDb().collection('personas').findOne({ _id: id })
    if (!doc) return res.status(404).json({ error: 'Persona not found' })
    res.json(doc)
  } catch (err) { next(err) }
})

// POST /api/personas
router.post('/', requireApiToken, mutateLimiter, async (req, res, next) => {
  try {
    const col     = getDb().collection('personas')
    const payload = validatePersonaPayload(req.body)
    const result  = await col.insertOne(payload)
    const doc     = await col.findOne({ _id: result.insertedId })
    res.status(201).json(doc)
  } catch (err) { next(err) }
})

// PUT /api/personas/:id
router.put('/:id', requireApiToken, mutateLimiter, async (req, res, next) => {
  try {
    const id       = validateIdParam(req.params.id)
    const col      = getDb().collection('personas')
    const existing = await col.findOne({ _id: id })
    if (!existing) return res.status(404).json({ error: 'Persona not found' })

    const payload = validatePersonaPayload(req.body, { partial: true })
    await col.updateOne({ _id: id }, { $set: payload })
    const updated = await col.findOne({ _id: id })
    res.json(updated)
  } catch (err) { next(err) }
})

// DELETE /api/personas/:id
router.delete('/:id', requireApiToken, mutateLimiter, async (req, res, next) => {
  try {
    const id  = validateIdParam(req.params.id)
    const col = getDb().collection('personas')
    const doc = await col.findOne({ _id: id })
    if (!doc) return res.status(404).json({ error: 'Persona not found' })
    await col.deleteOne({ _id: id })
    res.json({ acknowledged: true })
  } catch (err) { next(err) }
})

export default router
