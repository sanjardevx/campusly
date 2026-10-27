import { graphql } from '@/libs/gql';

/** The public home page in one call (built by ISR on the server, not in the browser) */
export const SITE_HOME = graphql(`
  query SiteHome($locale: SiteLocale!) {
    siteHome(locale: $locale) {
      stats {
        students
        teachers
        programs
        founded
      }
      posts {
        id
        type
        title
        summary
        body
        coverUrl
        date
        startTime
        endTime
        place
      }
      programs {
        id
        category
        name
        gradeFrom
        gradeTo
        levelNote
        days
        startTime
        endTime
        description
        photoUrl
        videoUrl
      }
      director {
        id
        name
        role
        note
        photoUrl
      }
      team {
        id
        name
        role
        note
        photoUrl
      }
      mockTests {
        id
        exam
        title
        included
        date
        startTime
        durationMin
        location
        price
        seatsLeft
        contactName
        contactRole
        contactPhone
      }
      openCourses {
        id
        category
        title
        source
        description
        lessons {
          title
          youtubeId
          durationSec
        }
        totalDurationSec
      }
      honorStudents {
        id
        name
        className
        resultType
        place
        score
        subject
        competition
        achievedOn
        photoUrl
      }
      contact {
        schoolName
        phone
        officeHours
        address
        metro
        email
        telegramUrl
        instagramUrl
        youtubeUrl
      }
    }
  }
`);
