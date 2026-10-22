import { graphql } from '@/libs/gql';

// Admin console queries (DECISIONS §8: every one of them is @Roles(ADMIN) on the server)

/** Users page table: one page of one role, with the filters from the URL */
export const USERS = graphql(`
  query Users($input: UsersInquiry!) {
    users(input: $input) {
      list {
        id
        loginId
        role
        status
        firstName
        lastName
        className
        title
        phone
        passwordState
        tempPasswordUsesLeft
        lastActiveAt
        links {
          id
          loginId
          fullName
          relation
        }
      }
      metaCounter {
        total
      }
    }
  }
`);

/** The four tab counters in ONE request: GraphQL aliases call the same field four times */
export const USER_COUNTS = graphql(`
  query UserCounts {
    students: users(input: { page: 1, limit: 1, search: { role: STUDENT } }) {
      metaCounter {
        total
      }
    }
    teachers: users(input: { page: 1, limit: 1, search: { role: TEACHER } }) {
      metaCounter {
        total
      }
    }
    parents: users(input: { page: 1, limit: 1, search: { role: PARENT } }) {
      metaCounter {
        total
      }
    }
    admins: users(input: { page: 1, limit: 1, search: { role: ADMIN } }) {
      metaCounter {
        total
      }
    }
  }
`);

/** Classes of the current academic year (class filter, later the class pickers) */
export const GROUPS = graphql(`
  query Groups {
    groups {
      id
      name
      studentCount
      status
    }
  }
`);
