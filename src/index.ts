import { z } from 'zod'
import { Mongito } from './mongito'

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

  const dogsModel = mongito.model<Dog>('dogs', dogSchema)

  const res = await dogsModel.advancedFind({
    enhanceSearch: (cursor) => cursor.sort({ size: 'asc', name: 'desc' }).limit(2),
  })

  console.log({ res })

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

  // const old = await dogsModel.updateById('63ddbd1f9daf8ec18f183c3c', { values: { name: 'Docky', size: 'small' } })
  // console.log({ old })

  // const act = await dogsModel.findById('63ddbd1f9daf8ec18f183c3c')
  // console.log({ act })

  // const d = await dogsModel.findById('63dd178a6a9722aa15f3364d')
  // console.log({ d })

  // const dleted = await dogsModel.deleteById('63dd195bcb85727547c55928')
  // console.log({ dleted })

  await mongito.disconnect()
  console.log('finished')
}

run().catch(console.error)
