import type { Observable } from 'rxjs'

// graphql-js subscriptions are AsyncIterables, the game service speaks RxJS. This is the
// adapter: values wait in a queue until someone asks for `next()`, and when the client
// unsubscribes GraphQL calls `return()`, which drops the RxJS subscription (no leaks).
export function toAsyncIterable<T>(source: Observable<T>): AsyncIterableIterator<T> {
  const queue: T[] = []
  let waiting: ((result: IteratorResult<T>) => void) | undefined
  let finished = false

  const finish = () => {
    finished = true
    waiting?.({ value: undefined, done: true })
    waiting = undefined
  }

  const subscription = source.subscribe({
    next: value => {
      if (waiting) { waiting({ value, done: false }); waiting = undefined }
      else queue.push(value)
    },
    complete: finish,
    error: finish
  })

  return {
    next: () =>
      queue.length > 0 ? Promise.resolve({ value: queue.shift()!, done: false })
      : finished ? Promise.resolve({ value: undefined, done: true })
      : new Promise<IteratorResult<T>>(resolve => { waiting = resolve }),
    return: () => {
      subscription.unsubscribe()
      finish()
      return Promise.resolve({ value: undefined, done: true })
    },
    throw: error => {
      subscription.unsubscribe()
      finish()
      return Promise.reject(error)
    },
    [Symbol.asyncIterator]() { return this }
  }
}
