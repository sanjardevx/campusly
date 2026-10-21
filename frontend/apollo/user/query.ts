import { graphql } from '@/libs/gql';

export const ME = graphql(`
  query Me {
    me {
      id
      loginId
      role
      firstName
      lastName
      locale
      mustChangePassword
    }
  }
`);
