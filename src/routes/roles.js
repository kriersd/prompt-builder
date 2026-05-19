import { Router } from 'express'
import { getDb } from '../db/index.js'
import { createRateLimit, requireApiToken } from '../middleware/apiSecurity.js'
import { validateRolePayload, validateIdParam } from '../validation/payloads.js'

const router = Router()
const mutateLimiter = createRateLimit({
  bucket: 'roles:mutate',
  windowMs: 60_000,
  maxRequests: 20,
  message: 'Too many role changes. Please try again in a minute.',
})

// GET /api/roles  — optionally filter by ?category=
router.get('/', async (req, res, next) => {
  try {
    const filter = req.query.category
      ? { category: String(req.query.category).trim() }
      : {}
    const docs = await getDb().collection('roles').find(filter, {
      sort: { isDefault: -1, category: 1, name: 1 },
    })
    res.json({ data: docs })
  } catch (err) { next(err) }
})

// GET /api/roles/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id  = validateIdParam(req.params.id)
    const doc = await getDb().collection('roles').findOne({ _id: id })
    if (!doc) return res.status(404).json({ error: 'Role not found' })
    res.json(doc)
  } catch (err) { next(err) }
})

// POST /api/roles
router.post('/', requireApiToken, mutateLimiter, async (req, res, next) => {
  try {
    const col     = getDb().collection('roles')
    const payload = validateRolePayload(req.body)
    const result  = await col.insertOne({ ...payload, isDefault: false })
    const doc     = await col.findOne({ _id: result.insertedId })
    res.status(201).json(doc)
  } catch (err) { next(err) }
})

// DELETE /api/roles/:id  — built-in defaults cannot be deleted
router.delete('/:id', requireApiToken, mutateLimiter, async (req, res, next) => {
  try {
    const id  = validateIdParam(req.params.id)
    const col = getDb().collection('roles')
    const doc = await col.findOne({ _id: id })
    if (!doc) return res.status(404).json({ error: 'Role not found' })
    if (doc.isDefault) return res.status(403).json({ error: 'Cannot delete a built-in role' })
    await col.deleteOne({ _id: id })
    res.json({ acknowledged: true })
  } catch (err) { next(err) }
})

export default router
