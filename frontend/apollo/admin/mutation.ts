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

/** Student + (optional) parent in one transaction; the IDs come from the atomic id_counters */
export const CREATE_STUDENT = graphql(`
  mutation CreateStudent($input: CreateStudentInput!) {
    createStudent(input: $input) {
      student {
        userId
        loginId
        fullName
        role
        tempPassword
        isNew
      }
      parent {
        userId
        loginId
        fullName
        role
        tempPassword
        isNew
      }
    }
  }
`);

/** Second parent: found by phone or created; an existing parent keeps their password */
export const LINK_PARENT = graphql(`
  mutation LinkParent($studentId: String!, $input: ParentInput!) {
    linkParent(studentId: $studentId, input: $input) {
      userId
      loginId
      fullName
      role
      tempPassword
      isNew
    }
  }
`);

export const CREATE_TEACHER = graphql(`
  mutation CreateTeacher($input: CreateTeacherInput!) {
    createTeacher(input: $input) {
      userId
      loginId
      fullName
      role
      tempPassword
      isNew
    }
  }
`);

/** CSV step 2: checks every row, writes nothing. The file goes as text (no multipart upload) */
export const PREVIEW_IMPORT = graphql(`
  mutation PreviewStudentImport($csv: String!) {
    previewStudentImport(csv: $csv) {
      rows {
        line
        firstName
        lastName
        className
        admissionYear
        parentName
        parentPhone
        status
        loginIdPreview
        errors {
          code
          value
        }
      }
      summary {
        ready
        linkParent
        errors
      }
    }
  }
`);

/** CSV step 3: checks again and creates all good rows in ONE transaction */
export const IMPORT_STUDENTS = graphql(`
  mutation ImportStudents($csv: String!, $skipErrors: Boolean!) {
    importStudents(csv: $csv, skipErrors: $skipErrors) {
      created
      linkedParents
      skipped
      slips {
        student {
          userId
          loginId
          fullName
          role
          tempPassword
          isNew
        }
        parent {
          userId
          loginId
          fullName
          role
          tempPassword
          isNew
        }
      }
    }
  }
`);
