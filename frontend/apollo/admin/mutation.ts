import { graphql } from '@/libs/gql';

// Admin actions. Each one changes ONE user (own transaction + AuditLog row on the server);
// the users page runs them one by one for a selection.

/** New temporary password. The result is shown once and never written to the Apollo cache */
export const RESET_PASSWORD = graphql(`
  mutation ResetPassword($userId: String!) {
    resetPassword(userId: $userId) {
      userId
      loginId
      fullName
      role
      tempPassword
      isNew
    }
  }
`);

export const BLOCK_USER = graphql(`
  mutation BlockUser($userId: String!) {
    blockUser(userId: $userId)
  }
`);

export const UNBLOCK_USER = graphql(`
  mutation UnblockUser($userId: String!) {
    unblockUser(userId: $userId)
  }
`);

export const MOVE_STUDENT = graphql(`
  mutation MoveStudent($input: MoveStudentInput!) {
    moveStudent(input: $input) {
      id
      name
      studentCount
    }
  }
`);
