/**
 * JsonStore — MongoDB-compatible interface backed by local JSON files.
 *
 * The API mirrors the official MongoDB Node.js driver so that swapping to
 * MongoStore (see MongoStore.js) requires only changing the factory in
 * src/db/index.js — no route or service code changes needed.
 *
 * Supported filter operators: $eq $ne $gt $gte $lt $lte $in $nin $and $or
 * Supported update operators: $set $unset $push
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

// ─── Filter Matching ──────────────────────────────────────────────────────────

function matchesFilter(doc, filter) {
  for (const [key, value] of Object.entries(filter)) {
    if (key === '$and') {
      if (!value.every(f => matchesFilter(doc, f))) return false
      continue
    }
    if (key === '$or') {
      if (!value.some(f => matchesFilter(doc, f))) return false
      continue
    }

    const docVal = doc[key]

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [op, opVal] of Object.entries(value)) {
        switch (op) {
          case '$eq':  if (docVal !== opVal)            return false; break
          case '$ne':  if (docVal === opVal)            return false; break
          case '$gt':  if (!(docVal > opVal))           return false; break
          case '$gte': if (!(docVal >= opVal))          return false; break
          case '$lt':  if (!(docVal < opVal))           return false; break
          case '$lte': if (!(docVal <= opVal))          return false; break
          case '$in':  if (!opVal.includes(docVal))     return false; break
          case '$nin': if (opVal.includes(docVal))      return false; break
        }
      }
    } else {
      if (docVal !== value) return false
    }
  }
  return true
}

// ─── Update Application ───────────────────────────────────────────────────────

function applyUpdate(doc, update) {
  const result = { ...doc }
  for (const [op, fields] of Object.entries(update)) {
    switch (op) {
      case '$set':
        Object.assign(result, fields)
        break
      case '$unset':
        for (const field of Object.keys(fields)) delete result[field]
        break
      case '$push':
        for (const [field, val] of Object.entries(fields)) {
          if (!Array.isArray(result[field])) result[field] = []
          result[field].push(val)
        }
        break
    }
  }
  return result
}

// ─── Collection ───────────────────────────────────────────────────────────────

class Collection {
  constructor(filePath) {
    this._filePath = filePath
    this._data = this._load()
  }

  _load() {
    if (!existsSync(this._filePath)) return []
    try {
      return JSON.parse(readFileSync(this._filePath, 'utf8'))
    } catch {
      return []
    }
  }

  _save() {
    writeFileSync(this._filePath, JSON.stringify(this._data, null, 2), 'utf8')
  }

  async find(filter = {}, options = {}) {
    let results = this._data.filter(doc => matchesFilter(doc, filter))

    if (options.sort) {
      const [field, dir] = Object.entries(options.sort)[0]
      results = results.sort((a, b) => {
        if (a[field] < b[field]) return dir === -1 ? 1 : -1
        if (a[field] > b[field]) return dir === -1 ? -1 : 1
        return 0
      })
    }

    if (options.skip)  results = results.slice(options.skip)
    if (options.limit) results = results.slice(0, options.limit)

    return results
  }

  async findOne(filter = {}) {
    return this._data.find(doc => matchesFilter(doc, filter)) ?? null
  }

  async insertOne(doc) {
    const now = new Date().toISOString()
    const newDoc = {
      _id: randomUUID(),
      ...doc,
      createdAt: doc.createdAt ?? now,
      updatedAt: now,
    }
    this._data.push(newDoc)
    this._save()
    return { acknowledged: true, insertedId: newDoc._id }
  }

  async updateOne(filter, update) {
    const idx = this._data.findIndex(doc => matchesFilter(doc, filter))
    if (idx === -1) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 }

    this._data[idx] = {
      ...applyUpdate(this._data[idx], update),
      updatedAt: new Date().toISOString(),
    }
    this._save()
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 }
  }

  async deleteOne(filter) {
    const idx = this._data.findIndex(doc => matchesFilter(doc, filter))
    if (idx === -1) return { acknowledged: true, deletedCount: 0 }

    this._data.splice(idx, 1)
    this._save()
    return { acknowledged: true, deletedCount: 1 }
  }

  async countDocuments(filter = {}) {
    return this._data.filter(doc => matchesFilter(doc, filter)).length
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export class JsonStore {
  constructor(dataDir) {
    this._dataDir = dataDir
    mkdirSync(dataDir, { recursive: true })
    this._collections = {}
  }

  collection(name) {
    if (!this._collections[name]) {
      this._collections[name] = new Collection(join(this._dataDir, `${name}.json`))
    }
    return this._collections[name]
  }

  async close() {
    this._collections = {}
  }
}
