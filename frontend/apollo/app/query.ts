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

/** Sidebar footer: "Campusly · Student Portal · 2026–27" */
export const CURRENT_YEAR = graphql(`
  query CurrentYear {
    currentAcademicYear {
      id
      name
    }
  }
`);

/** The bell in the top bar: unread announcements for the viewer */
export const UNREAD_ANNOUNCEMENTS = graphql(`
  query UnreadAnnouncements {
    announcements(input: { limit: 1 }) {
      unread
    }
  }
`);

/** Periods of a year (top-bar "2026–27 · Quarter 1" pill, Settings) */
export const PERIODS = graphql(`
  query Periods($academicYearId: String!) {
    periods(academicYearId: $academicYearId) {
      id
      name
      kind
      order
      startsAt
      endsAt
      parentId
    }
  }
`);

/** School name (login slips) and the default grading weights (Add course) */
export const SCHOOL_SETTINGS = graphql(`
  query SchoolSettings {
    schoolSettings {
      schoolName
      timezone
      defaultLocale
      defaultHomeworkWeight
      defaultQuizWeight
      defaultExamWeight
    }
  }
`);
