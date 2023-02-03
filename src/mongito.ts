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
  // Filter,
} from 'mongodb'

export interface ModelOptions {
  versionKey?: boolean
}

export type Doc<T> = T & { _id: ObjectId; __v?: number }
export interface Model<P extends Document> {
  // count
  // insertMany
  // replace

  add(payload: P): Promise<Doc<P>>

  find(filters?: Partial<{ [key in keyof P]: P[key] }>, options?: FindOptions<P>): Promise<Doc<P>[]>
  findOneBy(filters?: Partial<{ [key in keyof P]: P[key] }>, options?: FindOptions<P>): Promise<Doc<P> | null>
  findById(id: string | ObjectId, options?: FindOptions<P>): Promise<Doc<P> | null>

  updateById(
    id: string | ObjectId,
    fields: Partial<{ [key in keyof P]: P[key] }>,
    options?: FindOneAndUpdateOptions,
  ): Promise<Doc<P> | null>
  updateOneBy(
    filters: Partial<{ [key in keyof P]: P[key] }>,
    fields: Partial<{ [key in keyof P]: P[key] }>,
    options?: FindOneAndUpdateOptions,
  ): Promise<Doc<P> | null>
  updateMany(
    filters?: Partial<{ [key in keyof P]: P[key] }>,
    fields?: Partial<{ [key in keyof P]: P[key] }>,
    options?: FindOneAndUpdateOptions,
  ): Promise<UpdateResult>

  delete(filters?: Partial<{ [key in keyof P]: P[key] }>, options?: DeleteOptions): Promise<number>
  deleteOneBy(
    filters?: Partial<{ [key in keyof P]: P[key] }>,
    options?: FindOneAndDeleteOptions,
  ): Promise<Doc<P> | null>
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
    // TODO: what about limit, filter, project, aggregate, sort
    const collection = this.db.collection(collectionName)
    const withVersion = options?.versionKey ?? true

    const docSchema: Schema<Doc<P>> = validationSchema.and(
      z.object({ _id: z.instanceof(ObjectId), __v: z.number().optional() }),
    )

    return {
      add: async (payload) => {
        validationSchema.parse(payload)

        const { acknowledged, insertedId } = await collection.insertOne({
          ...payload,
          ...(withVersion ? { __v: 0 } : {}),
        })
        if (acknowledged) return { _id: insertedId, ...payload, ...(withVersion ? { __v: 0 } : {}) }
        throw new Error('Failed to insert document')
      },

      find: async (filters, opts) => {
        const founds = await collection.find(filters ?? {}, opts).toArray()
        return founds.map((doc) => docSchema.parse(doc))
      },

      findOneBy: async (filters, opts) => {
        const doc = await collection.findOne(filters ?? {}, opts)
        return !doc ? null : docSchema.parse(doc)
      },

      findById: async (id, opts) => {
        const doc = await collection.findOne({ _id: typeof id == 'string' ? new ObjectId(id) : id }, opts)
        return !doc ? null : docSchema.parse(doc)
      },

      updateById: async (id, values, opts) => {
        const res = await collection.findOneAndUpdate(
          { _id: typeof id == 'string' ? new ObjectId(id) : id },
          { $set: { ...values }, ...(withVersion ? { $inc: { __v: 1 } } : {}) },
          opts,
        )
        return res.value ? docSchema.parse(res.value) : null
      },

      updateOneBy: async (filters, values, opts) => {
        const res = await collection.findOneAndUpdate(
          filters ?? {},
          { $set: { ...values }, ...(withVersion ? { $inc: { __v: 1 } } : {}) },
          opts,
        )
        return res.value ? docSchema.parse(res.value) : null
      },

      updateMany: async (filters, values, opts) => {
        const res = await collection.updateMany(
          filters ?? {},
          { $set: { ...values }, ...(withVersion ? { $inc: { __v: 1 } } : {}) },
          opts,
        )
        if (res.acknowledged) return res
        throw new Error('failed to update docs')
      },

      deleteById: async (id) => {
        const res = await collection.findOneAndDelete({ _id: typeof id == 'string' ? new ObjectId(id) : id })
        return res.value ? docSchema.parse(res.value) : null
      },

      deleteOneBy: async (filters, opts) => {
        const res = await collection.findOneAndDelete(filters ?? {}, opts)
        return res.value ? docSchema.parse(res.value) : null
      },

      delete: async (filters, opts) => {
        const res = await collection.deleteMany(filters ?? {}, opts)
        if (res.acknowledged) return res.deletedCount
        throw new Error('deletion ack failed') // TODO: custom error
      },
    }
  }

  disconnect(): Promise<void> {
    return this.client.close()
  }
}
