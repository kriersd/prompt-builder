import { Router } from 'express'
import { getDb } from '../db/index.js'
import { createRateLimit, requireApiToken } from '../middleware/apiSecurity.js'
import {
  validateCategoryQuery,
  validateIdParam,
  validateTemplatePayload,
} from '../validation/payloads.js'

const router = Router()
const mutateLimiter = createRateLimit({
  bucket: 'templates:mutate',
  windowMs: 60_000,
  maxRequests: 20,
  message: 'Too many template changes. Please try again in a minute.',
})

// GET /api/templates  — optionally filter by ?category=
router.get('/', async (req, res, next) => {
  try {
    const { category } = validateCategoryQuery(req.query)
    const filter = category ? { category } : {}
    const docs   = await getDb().collection('templates').find(filter, {
      sort: { isDefault: -1, name: 1 },
    })
    res.json({ data: docs })
  } catch (err) { next(err) }
})

// GET /api/templates/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = validateIdParam(req.params.id)
    const doc = await getDb().collection('templates').findOne({ _id: id })
    if (!doc) return res.status(404).json({ error: 'Template not found' })
    res.json(doc)
  } catch (err) { next(err) }
})

// POST /api/templates
router.post('/', requireApiToken, mutateLimiter, async (req, res, next) => {
  try {
    const col    = getDb().collection('templates')
    const payload = validateTemplatePayload(req.body)
    const result = await col.insertOne({ ...payload, isDefault: false })
    const doc    = await col.findOne({ _id: result.insertedId })
    res.status(201).json(doc)
  } catch (err) { next(err) }
})

// PUT /api/templates/:id
router.put('/:id', requireApiToken, mutateLimiter, async (req, res, next) => {
  try {
    const id = validateIdParam(req.params.id)
    const col      = getDb().collection('templates')
    const existing = await col.findOne({ _id: id })
    if (!existing) return res.status(404).json({ error: 'Template not found' })

    const payload = validateTemplatePayload(req.body, { partial: true })
    await col.updateOne({ _id: id }, { $set: payload })
    const updated = await col.findOne({ _id: id })
    res.json(updated)
  } catch (err) { next(err) }
})

// DELETE /api/templates/:id  — prevent deleting built-in defaults
router.delete('/:id', requireApiToken, mutateLimiter, async (req, res, next) => {
  try {
    const id = validateIdParam(req.params.id)
    const col = getDb().collection('templates')
    const doc = await col.findOne({ _id: id })
    if (!doc) return res.status(404).json({ error: 'Template not found' })
    if (doc.isDefault) return res.status(403).json({ error: 'Cannot delete a built-in template' })

    await col.deleteOne({ _id: id })
    res.json({ acknowledged: true })
  } catch (err) { next(err) }
})

export default router
