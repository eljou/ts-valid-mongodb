import { randomUUID } from 'crypto'
import { z } from 'zod'
import TsValidMongoDb, { Schema } from '../index'

const reservationSchema = z.object({
  id: z.string().uuid(),
  onBehalf: z.string(),
  access: z.enum(['VIP', 'NORMAL']),
  accepted: z.boolean(),
  seats: z.number(),
  groupNames: z.array(z.string()),
  createdAt: z.date(),
})

console.log('app')
async function run() {
  const client = TsValidMongoDb.create('mongodb://127.0.0.1:27017', 'test')
  await client.connect()
  console.log('connected')

  const reservationsModel = client.createModel(new Schema('reservation', reservationSchema))

  await reservationsModel.insert({
    id: randomUUID(),
    onBehalf: 'Karmak',
    accepted: true,
    access: 'NORMAL',
    seats: 6,
    groupNames: ['Pedrito', 'Juanito'],
    createdAt: new Date(),
  })

  const found = await reservationsModel.find({ onBehalf: 'Jhon' })
  console.log(found)

  await client.disconnect()
  console.log('finished')
}

run().catch(console.error)
