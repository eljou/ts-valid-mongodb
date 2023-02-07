import { Schema as ZodSchema } from 'zod'
import { pluralize } from 'inflection'
import { IndexDescription, IndexDirection } from 'mongodb'

interface SchemaOptions<T> {
  versionKey?: boolean
  collection?: string
  autoCreateCollection?: boolean
  indexes?: (IndexDescription & {
    key: Partial<{ [k in keyof T]: IndexDirection }>
  })[]
}

export class Schema<P> {
  constructor(private name: string, public validationSchema: ZodSchema<P>, public options?: SchemaOptions<P>) {}

  getCollectionName(): string {
    const dirtyName = this.options?.collection ?? this.name
    const res = dirtyName
      .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
      ?.map((x) => x.toLowerCase())
      .join('_')
    if (res) return pluralize(res)

    throw new Error('invalid empty collection name')
  }
}
