# ts-valid-mongodb

Thin layer over [mongodb](https://www.npmjs.com/package/mongodb) native driver to support strongly typed models leveraging the power of [zod](https://www.npmjs.com/package/zod) schema library

## Instalation

---

**From npm**

```sh
npm install ts-valid-mongodb
```

### Requirements

---

- TypeScript 4.5+!
- You must enable `strict` mode in your `tsconfig.json`. This is a best practice for all TypeScript projects.

```json
// tsconfig.json
{
  // ...
  "compilerOptions": {
    // ...
    "strict": true
  }
}
```

## Basic Usage

---

```ts
import { z } from 'zod'
import { randomUUID } from 'crypto'
import tsValidMongoDb, { Schema } from 'ts-valid-mongodb'

const reservationSchema = z.object({
  id: z.string().uuid(),
  onBehalf: z.string(),
  access: z.enum(['VIP', 'NORMAL']),
  accepted: z.boolean(),
  seats: z.number(),
  groupNames: z.array(z.string()),
  createdAt: z.date(),
})

async function run() {
  await tsValidMongoDb.connect('mongodb://127.0.0.1:27017', 'test')
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
}

run().catch(console.error)
```

## Motivation

---

When working with mongodb on nodejs usually we tend to use mongoose has an ODM abstraction that guarantees type safety on storing, updating an querying our documents on the DB.

A common problem when using Mongoose with TypeScript is that you have to define both the Mongoose model and the TypeScript interface. If the model changes, you also have to keep the TypeScript interface file in sync or the TypeScript interface would not represent the real data structure of the model. If you try to make strong bindings over models and interfaces mongoose complex type definitions will make your editor go slow or break compilation on complex cases.

Other alternatives as [typegoose](https://www.npmjs.com/package/@typegoose/typegoose)
or [type-mongodb](https://www.npmjs.com/package/type-mongodb) make heavy use of @decorators in order to achieve the same goal, but has complex workflows, known issue, or bad support.

Because of these drawbacks of mongoose and other alternatives **ts-valid-mongo-db** is born.

## Versioning

---

This Project should comply with [Semver](https://semver.org/).
