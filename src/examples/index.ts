import { randomUUID } from 'crypto'
import { z } from 'zod'
import tsValidMongoDb, { Schema } from '../index'

// TODO: autoIndex

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
  await tsValidMongoDb.connect('mongodb://127.0.0.1:27017', 'test')
  console.log('connected')

  const reservationsModel = tsValidMongoDb.createModel(new Schema('reservation', reservationSchema))

  await reservationsModel.insert({
    id: randomUUID(),
    onBehalf: 'Jhon',
    accepted: true,
    access: 'NORMAL',
    seats: 6,
    groupNames: ['Pedrito', 'Juanito'],
    createdAt: new Date(),
  })

  const found = await reservationsModel.find({ onBehalf: 'Jhon' })
  console.log(found)

  await tsValidMongoDb.disconnect()
  console.log('finished')
}

run().catch(console.error)
