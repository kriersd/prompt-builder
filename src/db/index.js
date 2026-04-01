import { resolve } from 'path'
import { JsonStore } from './JsonStore.js'
import { MongoStore } from './MongoStore.js'

let db = null

export async function connectDb() {
  const dbType = process.env.DB_TYPE || 'json'

  if (dbType === 'mongodb') {
    const uri    = process.env.MONGODB_URI
    const dbName = process.env.MONGODB_DB_NAME || 'promptforge'

    if (!uri) throw new Error('MONGODB_URI must be set when DB_TYPE=mongodb')

    const store = new MongoStore(uri, dbName)
    await store.connect()
    db = store
  } else {
    const dataDir = resolve(process.env.DATA_DIR || './data')
    db = new JsonStore(dataDir)
    console.log(`[db] Using JSON store at: ${dataDir}`)
  }

  return db
}

export function getDb() {
  if (!db) throw new Error('Database not initialised. Call connectDb() first.')
  return db
}
