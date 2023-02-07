export type DbOperations = 'find' | 'update' | 'delete' | 'insert' | 'collection' | 'index'

export class DbFailure extends Error {
  constructor(public operation: DbOperations, public nativeError?: Error) {
    super(
      `Failed at running operation: ${operation}. ${
        nativeError ? `with error: ${nativeError.name}: ${nativeError.message}` : ''
      }`,
    )
  }
}
