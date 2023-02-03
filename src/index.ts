import { z, Schema } from 'zod'
import { Db, MongoClient, ObjectId, Document, FindOptions } from 'mongodb'

interface ModelOptions {
  versionKey?: boolean
}

type Doc<T> = T & { _id: ObjectId; __v?: number }
interface Model<P extends Document> {
  add(payload: P): Promise<Doc<P>>

  find(filters?: Partial<{ [key in keyof P]: P[key] }>, options?: FindOptions<P>): Promise<Doc<P>[]>

  findById(id: string | ObjectId): Promise<Doc<P> | null>
}

class Mongito {
  private client: MongoClient
  private db: Db

  constructor(url: string, dbName: string) {
    this.client = new MongoClient(url)
    this.db = this.client.db(dbName)
  }

  connect() {
    return this.client.connect()
  }

  createModel<P extends Document>(
    collectionName: string,
    validationSchema: Schema<P>,
    options?: ModelOptions,
  ): Model<P> {
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
        const founds = await collection.find(filters ? filters : {}, opts).toArray()
        return founds.map((doc) => docSchema.parse(doc))
      },

      findById: async (id) => {
        const doc = await collection.findOne({ _id: new ObjectId(id) })
        return !doc ? null : docSchema.parse(doc)
      },
    }
  }

  disconnect() {
    return this.client.close()
  }
}

const dogSchema = z.object({
  name: z.string(),
  size: z.enum(['big', 'small']),
  createdAt: z.date(),
})
type Dog = z.infer<typeof dogSchema>

console.log('app')
async function run() {
  console.log('connected')
  const mongito = new Mongito('mongodb://127.0.0.1:27017', 'test')
  await mongito.connect()

  const dogsModel = mongito.createModel<Dog>('dogs', dogSchema)

  /* await dogsModel.add({
    name: 'Toby',
    size: 'big',
    createdAt: new Date(),
  }) */

  // const dogs = await dogsModel.find({ size: 'small' })
  // console.log({ dogs })
  const d = await dogsModel.findById('63dc7c7c50a78f4eafb81b7c')
  console.log({ d })

  await mongito.disconnect()
  console.log('finished')
}

run().catch(console.error)

/* async function run() {
  const client = await new MongoClient(
    'mongodb://127.0.0.1:27017/test',
    // { pkFactory: { createPk: () => new UUID().toBinary() },}
  ).connect()
  console.log('connected')

  const db = client.db('test')
  // const collections = await db.listCollections().toArray()
  // collections.forEach((c) => console.log(c.name))
  // await db.createCollection('drivers')
  const clientsCollection = db.collection('drivers')
  await clientsCollection.createIndex({ email: 1 }, { unique: true })
  await clientsCollection.deleteMany()

  const r = await clientsCollection.insertOne({
    name: 'jhon',
    age: 22,
    email: 'hello@dock.com',
    create_at: new Date(),
  })

  console.log(r.insertedId)

  await client.close()
  console.log('finished')
} */
