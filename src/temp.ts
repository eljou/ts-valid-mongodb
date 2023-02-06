import { pluralize } from 'inflection'
// import { MongoClient } from 'mongodb'

// interface Car {
//   brand: string
//   maxRpm: number
//   model: string
//   year: number
//   automatic: boolean
// }

async function main() {
  const res = pluralize('billing-intention')
  console.log({ res })

  // const client = new MongoClient('')

  // const db = client.db('some')

  // const collection = db.collection<Car>('car')

  // collection.find({ brand: 'una' }).sort(['brand', 'maxRpm'], 'asc')
}

main()
