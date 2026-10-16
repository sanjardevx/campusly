import { useMemo } from 'react';
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { API_GRAPHQL_URL } from '../libs/config';

// Day 1: plain HTTP link only. Day 9 adds the auth link (Bearer token from memory),
// single-flight token refresh and the error link (UNAUTHENTICATED, PASSWORD_CHANGE_REQUIRED).
let apolloClient: ApolloClient | undefined;

function createApolloClient() {
  return new ApolloClient({
    ssrMode: typeof window === 'undefined',
    link: new HttpLink({ uri: API_GRAPHQL_URL }),
    cache: new InMemoryCache(),
  });
}

// Same idea as Nestar's initializeApollo: a new client for every server render
// (no cache shared between users), one shared client in the browser.
export function initializeApollo() {
  if (typeof window === 'undefined') return createApolloClient();
  apolloClient ??= createApolloClient();
  return apolloClient;
}

export function useApollo() {
  return useMemo(() => initializeApollo(), []);
}
