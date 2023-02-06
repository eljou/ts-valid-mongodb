import { z, Schema } from 'zod'
import { Db, MongoClient, ObjectId, Document, Filter, UpdateFilter, MongoClientOptions } from 'mongodb'
import { Doc, Model } from './model'
import { MonguitoSchema } from './schema'

type DbOperations = 'find' | 'update' | 'delete' | 'insert'

class MonguitoError extends Error {
  constructor(public operation: DbOperations, public nativeError?: Error) {
    super(
      `Failed at running operation: ${operation}. ${
        nativeError ? `with error: ${nativeError.name}: ${nativeError.message}` : ''
      }`,
    )
  }
}

export class Monguito {
  private client: MongoClient
  private db: Db

  constructor(url: string, dbName: string, options?: MongoClientOptions) {
    this.client = new MongoClient(url, options)
    this.db = this.client.db(dbName)
  }

  connect(): Promise<MongoClient> {
    return this.client.connect()
  }

  async getModel<P extends Document>(schema: MonguitoSchema<P>): Promise<Model<P>> {
    const mapError = <R>(operation: DbOperations, cb: () => R): R => {
      try {
        return cb()
      } catch (error) {
        throw new MonguitoError(operation, error instanceof Error ? error : new Error(`${error}`))
      }
    }
    const collectionName = schema.className()
    const { validationSchema, options } = schema

    if (schema.options?.autoCreateCollection === false) {
      const cols = await this.db.listCollections().toArray()
      if (!cols.some((c) => c.name == collectionName))
        throw new MonguitoError(
          'find',
          new Error(`Collection ${collectionName} was not found and autoCreateCollection is false`),
        )
    }

    const collection = this.db.collection(collectionName)
    if (schema.options?.indexes) await collection.createIndexes(schema.options?.indexes)

    const withVersion = options?.versionKey ?? true

    const docSchema: Schema<Doc<P>> = validationSchema.and(
      z.object({ _id: z.instanceof(ObjectId), __v: z.number().optional() }),
    )

    return {
      count: (filters, opts) => mapError('find', () => collection.countDocuments(filters, opts)),

      insertMany: (list, opts) =>
        mapError('insert', async () => {
          const res = await collection.insertMany(list, opts)
          if (res.acknowledged) return res.insertedCount
          throw new Error(`Insertion of ${list.length} items was not aknowledged`)
        }),

      insert: (payload, opts) =>
        mapError('insert', async () => {
          validationSchema.parse(payload)

          const { acknowledged, insertedId } = await collection.insertOne(
            { ...payload, ...(withVersion ? { __v: 0 } : {}) },
            opts,
          )
          if (acknowledged) return { _id: insertedId, ...payload, ...(withVersion ? { __v: 0 } : {}) }
          throw new Error(`Insertion of document was not aknowledged`)
        }),

      advancedFind: ({ enhanceSearch, filters }, outputSchema, opts) =>
        mapError('find', async () => {
          const cursor = collection.find((filters ?? {}) as Filter<Document>, opts)
          const founds = await enhanceSearch(cursor as any).toArray()

          if (outputSchema) return founds.map((d) => outputSchema.parse(d)) as any
          return founds.map((doc) => docSchema.parse(doc))
        }),

      find: (filters, opts) =>
        mapError('find', async () => {
          const founds = await collection.find((filters ?? {}) as Filter<Document>, opts).toArray()
          return founds.map((doc) => docSchema.parse(doc))
        }),

      findOneBy: (filters, opts) =>
        mapError('find', async () => {
          const doc = await collection.findOne(filters as Filter<Document>, opts)
          return !doc ? null : docSchema.parse(doc)
        }),

      findById: (id, opts) =>
        mapError('find', async () => {
          const doc = await collection.findOne({ _id: typeof id == 'string' ? new ObjectId(id) : id }, opts)
          return !doc ? null : docSchema.parse(doc)
        }),

      updateById: (id, { mode = 'basic', values }, opts) =>
        mapError('update', async () => {
          const _id = typeof id == 'string' ? new ObjectId(id) : id
          const updateValues = (mode == 'advanced' ? { ...values } : { $set: { ...values } }) as UpdateFilter<Document>
          if (withVersion) updateValues.$inc = { __v: 1 }

          const res = await collection.findOneAndUpdate({ _id }, updateValues, opts)
          return res.value ? docSchema.parse(res.value) : null
        }),

      updateOneBy: ({ mode = 'basic', values }, filters, opts) =>
        mapError('update', async () => {
          const updateValues = (mode == 'advanced' ? { ...values } : { $set: { ...values } }) as UpdateFilter<Document>
          if (withVersion) updateValues.$inc = { __v: 1 }

          const res = await collection.findOneAndUpdate(filters as Filter<Document>, updateValues, opts)
          return res.value ? docSchema.parse(res.value) : null
        }),

      updateMany: ({ mode = 'basic', values }, filters, opts) =>
        mapError('update', async () => {
          const updateValues = (mode == 'advanced' ? { ...values } : { $set: { ...values } }) as UpdateFilter<Document>
          if (withVersion) updateValues.$inc = { __v: 1 }

          const res = await collection.updateMany((filters ?? {}) as Filter<Document>, updateValues, opts)
          if (res.acknowledged) return res
          throw new Error('Update of documents was not aknowledged')
        }),

      deleteById: (id) =>
        mapError('delete', async () => {
          const res = await collection.findOneAndDelete({ _id: typeof id == 'string' ? new ObjectId(id) : id })
          return res.value ? docSchema.parse(res.value) : null
        }),

      deleteOneBy: (filters, opts) =>
        mapError('delete', async () => {
          const res = await collection.findOneAndDelete(filters as Filter<Document>, opts)
          return res.value ? docSchema.parse(res.value) : null
        }),

      delete: (filters, opts) =>
        mapError('delete', async () => {
          const res = await collection.deleteMany((filters ?? {}) as Filter<Document>, opts)
          if (res.acknowledged) return res.deletedCount
          throw new Error('Deletion of documents was not aknowledged')
        }),
    }
  }

  getDb(): Db {
    return this.db
  }

  disconnect(): Promise<void> {
    return this.client.close()
  }
}
