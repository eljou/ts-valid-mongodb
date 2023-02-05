import {
  ObjectId,
  Document,
  FindOptions,
  DeleteOptions,
  FindOneAndDeleteOptions,
  FindOneAndUpdateOptions,
  UpdateResult,
  Filter,
  UpdateFilter,
  FindCursor,
  InsertOneOptions,
  BulkWriteOptions,
} from 'mongodb'
import { Schema } from 'zod'

export type Doc<T> = T & { _id: ObjectId; __v?: number }

export interface Model<P extends Document> {
  count(filters?: Filter<P>, options?: FindOptions<P>): Promise<number>

  insert(payload: P, options?: InsertOneOptions): Promise<Doc<P>>
  insertMany(list: P[], options?: BulkWriteOptions): Promise<number>

  advancedFind<Q = void, O extends null | Schema<Q> = Q extends void ? null : Schema<Q>>(
    config: {
      enhanceSearch: (cursor: FindCursor<P>) => FindCursor<P>
      filters?: Filter<P>
    },
    outputSchema: O,
    options?: FindOptions<P>,
  ): Promise<(O extends null ? Doc<P> : Q)[]>
  find(filters?: Filter<P>, options?: FindOptions<P>): Promise<Doc<P>[]>
  findOneBy(filters?: Filter<P>, options?: FindOptions<P>): Promise<Doc<P> | null>
  findById(id: string | ObjectId, options?: FindOptions<P>): Promise<Doc<P> | null>

  updateById<M extends 'basic' | 'advanced' = 'basic'>(
    id: string | ObjectId,
    updateProps: {
      mode?: M
      values: M extends 'advanced' ? UpdateFilter<P> : Partial<{ [key in keyof P]: P[key] }>
    },
    options?: FindOneAndUpdateOptions,
  ): Promise<Doc<P> | null>
  updateOneBy<M extends 'basic' | 'advanced' = 'basic'>(
    updateProps: {
      mode?: M
      values: M extends 'advanced' ? UpdateFilter<P> : Partial<{ [key in keyof P]: P[key] }>
    },
    filters: Filter<P>,
    options?: FindOneAndUpdateOptions,
  ): Promise<Doc<P> | null>
  updateMany<M extends 'basic' | 'advanced' = 'basic'>(
    updateProps: {
      mode?: M
      values: M extends 'advanced' ? UpdateFilter<P> : Partial<{ [key in keyof P]: P[key] }>
    },
    filters?: Filter<P>,
    options?: FindOneAndUpdateOptions,
  ): Promise<UpdateResult>

  delete(filters?: Filter<P>, options?: DeleteOptions): Promise<number>
  deleteOneBy(filters: Filter<P>, options?: FindOneAndDeleteOptions): Promise<Doc<P> | null>
  deleteById(id: string | ObjectId, options?: FindOneAndDeleteOptions): Promise<Doc<P> | null>
}
