import { randomUUID } from 'crypto'
import { z } from 'zod'
import { Monguito } from './mongito'
import { MonguitoSchema } from './schema'

// TODO: autoCreate collection
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

class Reservation extends MonguitoSchema<z.infer<typeof reservationSchema>> {}

console.log('app')
async function run() {
  console.log('connected')
  const mongito = new Monguito('mongodb://127.0.0.1:27017', 'test')
  await mongito.connect()

  const reservationsModel = await mongito.getModel(new Reservation(reservationSchema))

  // await reservationsModel.insert({
  //   id: randomUUID(),
  //   onBehalf: 'Jhon',
  //   accepted: true,
  //   access: 'NORMAL',
  //   seats: 6,
  //   groupNames: ['Pedrito', 'Juanito'],
  //   createdAt: new Date(),
  // })

  /*   const res = await dogsModel.advancedFind<{ name: string }>(
    {
      enhanceSearch: (cursor) => cursor.sort({ size: 'asc' }).limit(2).project({ name: 1 }),
    },
    z.object({ name: z.string() }),
  )
  console.log({ res }) */

  /* await dogsModel.add({
    name: 'Toby',
    size: 'big',
    createdAt: new Date(),
  })

  await dogsModel.add({
    name: 'Doky',
    size: 'small',
    createdAt: new Date(),
  })


  await dogsModel.add({
    name: 'Sky',
    size: 'small',
    createdAt: new Date(),
  }) */

  // const count = await dogsModel.delete()
  // console.log({ count })

  // const dogs = await dogsModel.find()
  // console.log({ dogs })
  // console.log('=====')

  // const res = await dogsModel.updateMany({}, { size: 'small' })

  // console.log('=====')
  // const dogsV2 = await dogsModel.find()
  // console.log({ dogsV2 })

  // const frst = await dogsModel.findById('63dce6758bad2903e5371749')
  // console.log({ frst })

  // const old = await dogsModel.updateById('63dce6758bad2903e5371749', {
  //   mode: 'advanced',
  //   values: { $set: { name: 'Marshal', size: 'small' }, $currentDate: { createdAt: { $type: 'date' } } },
  // })
  // console.log({ old })

  // const act = await dogsModel.findById('63dce6758bad2903e5371749')
  // console.log({ act })
  // const d = await dogsModel.findById('63dd178a6a9722aa15f3364d')
  // console.log({ d })

  // const dleted = await dogsModel.deleteById('63dd195bcb85727547c55928')
  // console.log({ dleted })

  await mongito.disconnect()
  console.log('finished')
}

run().catch(console.error)
