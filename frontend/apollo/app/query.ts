import { graphql } from '@/libs/gql';

// Typed by codegen (libs/gql): the result type is HealthQuery, no hand-written interface
export const HEALTH = graphql(`
  query Health {
    health {
      status
      postgres
      redis
    }
  }
`);
