import type { ApolloClient, DocumentNode } from "@apollo/client";
import { Observable } from "rxjs";

// Wraps an Apollo subscription as an RxJS Observable.
//
// Compared with filling a Subject from outside, this Observable is COLD: the Apollo
// subscription starts when somebody subscribes and is cancelled by the returned teardown
// function when they unsubscribe. That gives you two things for free:
//   - no leaked websocket subscription when a component unmounts or the player logs out
//   - `retry()` works: resubscribing opens a brand new Apollo subscription
export function subscriptionsRxJS<T, Data>(
  apolloClient: ApolloClient,
  subscription_query: DocumentNode,
  variables: Record<string, unknown>,
  extractor: (data: Data) => T
): Observable<T> {
  return new Observable<T>(subscriber => {
    const apollo_subscription = apolloClient
      .subscribe<Data>({ query: subscription_query, variables })
      .subscribe({
        next({ data }) {
          if (data) subscriber.next(extractor(data))
        },
        error: err => subscriber.error(err),
        complete: () => subscriber.complete()
      })
    return () => apollo_subscription.unsubscribe()
  })
}
