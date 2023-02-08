import { z, Schema as ZodSchema } from 'zod'
import { Db, MongoClient, ObjectId, Document, Filter, UpdateFilter, MongoClientOptions, Collection } from 'mongodb'
import { Doc, Model } from './model'
import { Schema } from './schema'
import { DbOperations, DbFailure } from './errors'

// TODO: auto index

class TsValidMongoDb {
  private client: MongoClient | null = null
  private db: Db | null = null

  connect(url: string, dbName: string, options?: MongoClientOptions): Promise<MongoClient> {
    this.client = new MongoClient(url, options)
    this.db = this.client.db(dbName)
    return this.client.connect()
  }

  withClientConnect(client: MongoClient, dbName: string): Promise<MongoClient> {
    if (this.client) throw new Error('client has al ready been initialized')
    this.client = client
    this.db = this.client.db(dbName)
    return this.client.connect()
  }

  createModel<P extends Document>(schema: Schema<P>): Model<P> {
    let indexesChecked = false
    let collectionsChecked = false

    const collectionName = schema.getCollectionName()
    const { validationSchema, options } = schema
    const withVersion = options?.versionKey ?? true

    const docSchema: ZodSchema<Doc<P>> = validationSchema.and(
      z.object({ _id: z.instanceof(ObjectId), __v: z.number().optional() }),
    )

    let collectionModel: Collection | null = null
    const runSafe = async <R>(operation: DbOperations, cb: (col: Collection) => R): Promise<R> => {
      try {
        if (this.db == null) throw new Error('Mongodb connection not initialized')
        const db: Db = this.db
        if (!collectionModel) collectionModel = db.collection(collectionName)

        if (!collectionsChecked && schema.options?.autoCreateCollection === false) {
          const cols = await db.listCollections().toArray()
          collectionsChecked = true
          if (!cols.some((c) => c.name == collectionName))
            throw new DbFailure(
              'collection',
              new Error(`Collection ${collectionName} was not found and autoCreateCollection is false`),
            )
        }

        if (schema.options?.indexes && !indexesChecked) {
          await collectionModel.createIndexes(schema.options?.indexes)
          indexesChecked = true
        }

        return cb(collectionModel)
      } catch (error) {
        throw new DbFailure(operation, error instanceof Error ? error : new Error(`${error}`))
      }
    }

    return {
      count: async (filters, opts) => runSafe('find', (collection) => collection.countDocuments(filters, opts)),

      insertMany: async (list, opts) =>
        runSafe('insert', async (collection) => {
          const res = await collection.insertMany(list, opts)
          if (res.acknowledged) return res.insertedCount
          throw new Error(`Insertion of ${list.length} items was not aknowledged`)
        }),

      insert: async (payload, opts) =>
        runSafe('insert', async (collection) => {
          validationSchema.parse(payload)

          const { acknowledged, insertedId } = await collection.insertOne(
            { ...payload, ...(withVersion ? { __v: 0 } : {}) },
            opts,
          )
          if (acknowledged) return { _id: insertedId, ...payload, ...(withVersion ? { __v: 0 } : {}) }
          throw new Error(`Insertion of document was not aknowledged`)
        }),

      advancedFind: async ({ enhanceSearch, filters }, outputSchema, opts) =>
        runSafe('find', async (collection) => {
          const cursor = collection.find((filters ?? {}) as Filter<Document>, opts)
          const founds = await enhanceSearch(cursor as any).toArray()

          if (outputSchema) return founds.map((d) => outputSchema.parse(d)) as any
          return founds.map((doc) => docSchema.parse(doc))
        }),

      find: async (filters, opts) =>
        runSafe('find', async (collection) => {
          const founds = await collection.find((filters ?? {}) as Filter<Document>, opts).toArray()
          return founds.map((doc) => docSchema.parse(doc))
        }),

      findOneBy: async (filters, opts) =>
        runSafe('find', async (collection) => {
          const doc = await collection.findOne(filters as Filter<Document>, opts)
          return !doc ? null : docSchema.parse(doc)
        }),

      findById: async (id, opts) =>
        runSafe('find', async (collection) => {
          const doc = await collection.findOne({ _id: typeof id == 'string' ? new ObjectId(id) : id }, opts)
          return !doc ? null : docSchema.parse(doc)
        }),

      updateById: async (id, { mode = 'basic', values }, opts) =>
        runSafe('update', async (collection) => {
          const _id = typeof id == 'string' ? new ObjectId(id) : id
          const updateValues = (mode == 'advanced' ? { ...values } : { $set: { ...values } }) as UpdateFilter<Document>
          if (withVersion) updateValues.$inc = { __v: 1 }

          const res = await collection.findOneAndUpdate({ _id }, updateValues, opts)
          return res.value ? docSchema.parse(res.value) : null
        }),

      updateOneBy: async ({ mode = 'basic', values }, filters, opts) =>
        runSafe('update', async (collection) => {
          const updateValues = (mode == 'advanced' ? { ...values } : { $set: { ...values } }) as UpdateFilter<Document>
          if (withVersion) updateValues.$inc = { __v: 1 }

          const res = await collection.findOneAndUpdate(filters as Filter<Document>, updateValues, opts)
          return res.value ? docSchema.parse(res.value) : null
        }),

      updateMany: async ({ mode = 'basic', values }, filters, opts) =>
        runSafe('update', async (collection) => {
          const updateValues = (mode == 'advanced' ? { ...values } : { $set: { ...values } }) as UpdateFilter<Document>
          if (withVersion) updateValues.$inc = { __v: 1 }

          const res = await collection.updateMany((filters ?? {}) as Filter<Document>, updateValues, opts)
          if (res.acknowledged) return res
          throw new Error('Update of documents was not aknowledged')
        }),

      deleteById: async (id) =>
        runSafe('delete', async (collection) => {
          const res = await collection.findOneAndDelete({ _id: typeof id == 'string' ? new ObjectId(id) : id })
          return res.value ? docSchema.parse(res.value) : null
        }),

      deleteOneBy: async (filters, opts) =>
        runSafe('delete', async (collection) => {
          const res = await collection.findOneAndDelete(filters as Filter<Document>, opts)
          return res.value ? docSchema.parse(res.value) : null
        }),

      delete: async (filters, opts) =>
        runSafe('delete', async (collection) => {
          const res = await collection.deleteMany((filters ?? {}) as Filter<Document>, opts)
          if (res.acknowledged) return res.deletedCount
          throw new Error('Deletion of documents was not aknowledged')
        }),
    }
  }

  getDb(): Db {
    if (this.db == null) throw new Error('Mongodb connection not initialized')
    return this.db
  }

  disconnect(): Promise<void> {
    if (this.client == null) throw new Error('Mongodb connection not initialized')
    return this.client.close()
  }
}

export { Schema, Model, Doc }
export default new TsValidMongoDb()
