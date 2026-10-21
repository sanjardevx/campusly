import { useMemo } from 'react';
import {
  ApolloClient,
  ApolloLink,
  CombinedGraphQLErrors,
  HttpLink,
  InMemoryCache,
} from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import Router from 'next/router';
import { from, switchMap, throwError } from 'rxjs';
import { refreshAccessToken } from '@/libs/auth';
import { expiresSoon, getAccessToken } from '@/libs/auth/token';
import { API_GRAPHQL_URL } from '@/libs/config';

let apolloClient: ApolloClient | undefined;

const isBrowser = () => typeof window !== 'undefined';

/** Sends the user to sign in, then back to where they were */
function goToLogin() {
  if (!isBrowser() || Router.pathname.startsWith('/login')) return;
  void Router.replace({ pathname: '/login', query: { next: Router.asPath } });
}

/**
 * Every request: a token that is about to expire is refreshed first (single-flight),
 * then sent as "Authorization: Bearer ...". The token comes from memory, never localStorage.
 */
const authLink = new SetContextLink(async (prevContext) => {
  let token = getAccessToken();
  if (token && expiresSoon(token)) token = await refreshAccessToken();
  return {
    headers: {
      ...prevContext.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

/**
 * Error codes, never messages (Nestar compared message strings).
 * UNAUTHENTICATED: refresh once and send the same request again; no session → sign in.
 * PASSWORD_CHANGE_REQUIRED: only the "Set a new password" page is allowed.
 */
const errorLink = new ErrorLink(({ error, operation, forward }) => {
  if (!CombinedGraphQLErrors.is(error)) return;
  const code = error.errors[0]?.extensions?.code;

  if (code === 'UNAUTHENTICATED' && !operation.getContext().retried) {
    return from(refreshAccessToken()).pipe(
      switchMap((token) => {
        if (!token) {
          goToLogin();
          return throwError(() => error);
        }
        // `retried` stops a loop if the new token is refused too
        operation.setContext({ retried: true });
        return forward(operation);
      }),
    );
  }
  if (code === 'PASSWORD_CHANGE_REQUIRED' && isBrowser()) {
    void Router.replace('/password');
  }
});

function createApolloClient() {
  return new ApolloClient({
    ssrMode: !isBrowser(),
    // Order: errors wrap everything (so a retry goes through authLink again), then the token, then HTTP
    link: ApolloLink.from([
      errorLink,
      authLink,
      new HttpLink({ uri: API_GRAPHQL_URL }),
    ]),
    cache: new InMemoryCache(),
  });
}

// Same idea as Nestar's initializeApollo: a new client for every server render
// (no cache shared between users), one shared client in the browser.
export function initializeApollo() {
  if (!isBrowser()) return createApolloClient();
  apolloClient ??= createApolloClient();
  return apolloClient;
}

export function useApollo() {
  return useMemo(() => initializeApollo(), []);
}
