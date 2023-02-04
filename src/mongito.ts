import { z, Schema } from 'zod'
import {
  Db,
  MongoClient,
  ObjectId,
  Document,
  FindOptions,
  DeleteOptions,
  FindOneAndDeleteOptions,
  FindOneAndUpdateOptions,
  UpdateResult,
  Filter,
  UpdateFilter,
  FindCursor,
  InsertOneOptions,
  BulkWriteOptions,
} from 'mongodb'

export interface ModelOptions {
  versionKey?: boolean
}

export type Doc<T> = T & { _id: ObjectId; __v?: number }
export interface Model<P extends Document> {
  count(filters?: Filter<P>, options?: FindOptions<P>): Promise<number>

  insert(payload: P, options?: InsertOneOptions): Promise<Doc<P>>
  insertMany(list: P[], options?: BulkWriteOptions): Promise<number>

  advancedFind(
    config: {
      enhanceSearch: (cursor: FindCursor<P>) => FindCursor<P>
      filters?: Filter<P>
    },
    options?: FindOptions<P>,
  ): Promise<Doc<P>[]>
  find(filters?: Filter<P>, options?: FindOptions<P>): Promise<Doc<P>[]>
  findOneBy(filters?: Filter<P>, options?: FindOptions<P>): Promise<Doc<P> | null>
  findById(id: string | ObjectId, options?: FindOptions<P>): Promise<Doc<P> | null>

  updateById<M extends 'basic' | 'advanced' = 'basic'>(
    id: string | ObjectId,
    updateProps: {
      mode?: M
      values: M extends 'advanced' ? UpdateFilter<P> : Partial<{ [key in keyof P]: P[key] }>
    },
    options?: FindOneAndUpdateOptions,
  ): Promise<Doc<P> | null>
  updateOneBy<M extends 'basic' | 'advanced' = 'basic'>(
    updateProps: {
      mode?: M
      values: M extends 'advanced' ? UpdateFilter<P> : Partial<{ [key in keyof P]: P[key] }>
    },
    filters: Filter<P>,
    options?: FindOneAndUpdateOptions,
  ): Promise<Doc<P> | null>
  updateMany<M extends 'basic' | 'advanced' = 'basic'>(
    updateProps: {
      mode?: M
      values: M extends 'advanced' ? UpdateFilter<P> : Partial<{ [key in keyof P]: P[key] }>
    },
    filters?: Filter<P>,
    options?: FindOneAndUpdateOptions,
  ): Promise<UpdateResult>

  delete(filters?: Filter<P>, options?: DeleteOptions): Promise<number>
  deleteOneBy(filters: Filter<P>, options?: FindOneAndDeleteOptions): Promise<Doc<P> | null>
  deleteById(id: string | ObjectId, options?: FindOneAndDeleteOptions): Promise<Doc<P> | null>
}

export class Mongito {
  private client: MongoClient
  private db: Db

  constructor(url: string, dbName: string) {
    this.client = new MongoClient(url)
    this.db = this.client.db(dbName)
  }

  connect(): Promise<MongoClient> {
    return this.client.connect()
  }

  model<P extends Document>(collectionName: string, validationSchema: Schema<P>, options?: ModelOptions): Model<P> {
    // TODO: custom errors wrapper

    const collection = this.db.collection(collectionName)
    const withVersion = options?.versionKey ?? true

    const docSchema: Schema<Doc<P>> = validationSchema.and(
      z.object({ _id: z.instanceof(ObjectId), __v: z.number().optional() }),
    )

    return {
      count: (filters, opts) => collection.countDocuments(filters, opts),

      insertMany: async (list, opts) => {
        const res = await collection.insertMany(list, opts)
        if (res.acknowledged) return res.insertedCount
        throw new Error('error inserting many items')
      },

      insert: async (payload, opts) => {
        validationSchema.parse(payload)

        const { acknowledged, insertedId } = await collection.insertOne(
          { ...payload, ...(withVersion ? { __v: 0 } : {}) },
          opts,
        )
        if (acknowledged) return { _id: insertedId, ...payload, ...(withVersion ? { __v: 0 } : {}) }
        throw new Error('Failed to insert document')
      },

      advancedFind: async ({ enhanceSearch, filters }, opts) => {
        const cursor = collection.find((filters ?? {}) as Filter<Document>, opts)
        const founds = await enhanceSearch(cursor as any).toArray()

        return founds.map((doc) => docSchema.parse(doc))
      },

      find: async (filters, opts) => {
        const founds = await collection.find((filters ?? {}) as Filter<Document>, opts).toArray()
        return founds.map((doc) => docSchema.parse(doc))
      },

      findOneBy: async (filters, opts) => {
        const doc = await collection.findOne(filters as Filter<Document>, opts)
        return !doc ? null : docSchema.parse(doc)
      },

      findById: async (id, opts) => {
        const doc = await collection.findOne({ _id: typeof id == 'string' ? new ObjectId(id) : id }, opts)
        return !doc ? null : docSchema.parse(doc)
      },

      updateById: async (id, { mode = 'basic', values }, opts) => {
        const _id = typeof id == 'string' ? new ObjectId(id) : id
        const updateValues = (mode == 'advanced' ? { ...values } : { $set: { ...values } }) as UpdateFilter<Document>
        if (withVersion) updateValues.$inc = { __v: 1 }

        const res = await collection.findOneAndUpdate({ _id }, updateValues, opts)
        return res.value ? docSchema.parse(res.value) : null
      },

      updateOneBy: async ({ mode = 'basic', values }, filters, opts) => {
        const updateValues = (mode == 'advanced' ? { ...values } : { $set: { ...values } }) as UpdateFilter<Document>
        if (withVersion) updateValues.$inc = { __v: 1 }

        const res = await collection.findOneAndUpdate(filters as Filter<Document>, updateValues, opts)
        return res.value ? docSchema.parse(res.value) : null
      },

      updateMany: async ({ mode = 'basic', values }, filters, opts) => {
        const updateValues = (mode == 'advanced' ? { ...values } : { $set: { ...values } }) as UpdateFilter<Document>
        if (withVersion) updateValues.$inc = { __v: 1 }

        const res = await collection.updateMany((filters ?? {}) as Filter<Document>, updateValues, opts)
        if (res.acknowledged) return res
        throw new Error('failed to update docs')
      },

      deleteById: async (id) => {
        const res = await collection.findOneAndDelete({ _id: typeof id == 'string' ? new ObjectId(id) : id })
        return res.value ? docSchema.parse(res.value) : null
      },

      deleteOneBy: async (filters, opts) => {
        const res = await collection.findOneAndDelete(filters as Filter<Document>, opts)
        return res.value ? docSchema.parse(res.value) : null
      },

      delete: async (filters, opts) => {
        const res = await collection.deleteMany((filters ?? {}) as Filter<Document>, opts)
        if (res.acknowledged) return res.deletedCount
        throw new Error('deletion ack failed')
      },
    }
  }

  getDb(): Db {
    return this.db
  }

  disconnect(): Promise<void> {
    return this.client.close()
  }
}
