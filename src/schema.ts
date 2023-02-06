import { pluralize } from 'inflection'
import { IndexDescription, IndexDirection } from 'mongodb'
import { Schema } from 'zod'

interface SchemaOptions<T> {
  versionKey?: boolean
  collection?: string
  autoCreateCollection?: boolean
  indexes?: (IndexDescription & {
    key: Partial<{ [k in keyof T]: IndexDirection }>
  })[]
}

export abstract class MonguitoSchema<P> {
  constructor(public validationSchema: Schema<P>, public options?: SchemaOptions<P>) {}

  className(): string {
    const dirtyName = this.options?.collection ?? this.constructor.name
    const res = dirtyName
      .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
      ?.map((x) => x.toLowerCase())
      .join('_')
    if (res) return pluralize(res)

    throw new Error('invalid empty collection name')
  }
}
