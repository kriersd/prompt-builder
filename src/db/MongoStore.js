/**
 * MongoStore — MongoDB adapter with the same interface as JsonStore.
 *
 * To activate:
 *   1. Set DB_TYPE=mongodb in your .env
 *   2. Set MONGODB_URI and MONGODB_DB_NAME in your .env
 *   3. Run: npm install mongodb
 *
 * The `collection()` method returns a native MongoDB Collection object from
 * the official driver, which already implements find/findOne/insertOne/
 * updateOne/deleteOne/countDocuments — so no wrapper is needed.
 */

export class MongoStore {
  constructor(uri, dbName) {
    this._uri = uri
    this._dbName = dbName
    this._client = null
    this._db = null
  }

  async connect() {
    // Dynamically import so the app doesn't crash when 'mongodb' is not installed
    const { MongoClient } = await import('mongodb')
    this._client = new MongoClient(this._uri)
    await this._client.connect()
    this._db = this._client.db(this._dbName)
    console.log(`[db] Connected to MongoDB: ${this._dbName}`)
  }

  collection(name) {
    if (!this._db) throw new Error('MongoStore not connected. Call connect() first.')
    return this._db.collection(name)
  }

  async close() {
    await this._client?.close()
  }
}
