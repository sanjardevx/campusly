import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  EnquiryStatus,
  SiteCourseCategory,
  SiteHonorResult,
  SiteMockExam,
  SitePostStatus,
  SitePostType,
  SiteProgramCategory,
} from '../../enums/site.enum';

/** Text in the four site languages (admin forms); the public site gets one resolved string */
@ObjectType()
export class LocalizedText {
  @Field(() => String)
  en: string;

  @Field(() => String, { nullable: true })
  uz?: string | null;

  @Field(() => String, { nullable: true })
  ru?: string | null;

  @Field(() => String, { nullable: true })
  ko?: string | null;
}

// ─────────────────────────── admin ───────────────────────────

@ObjectType()
export class SitePostAdmin {
  @Field(() => String)
  id: string;

  @Field(() => SitePostType)
  type: SitePostType;

  @Field(() => LocalizedText)
  title: LocalizedText;

  @Field(() => LocalizedText)
  summary: LocalizedText;

  @Field(() => LocalizedText, { nullable: true })
  body: LocalizedText | null;

  /** Signed link (uploaded cover) or the demo picture's path */
  @Field(() => String, { nullable: true })
  coverUrl: string | null;

  @Field(() => String, { nullable: true })
  eventDate: string | null;

  @Field(() => String, { nullable: true })
  startTime: string | null;

  @Field(() => String, { nullable: true })
  endTime: string | null;

  @Field(() => LocalizedText, { nullable: true })
  place: LocalizedText | null;

  @Field(() => Int, { nullable: true })
  carouselPosition: number | null;

  @Field(() => SitePostStatus)
  status: SitePostStatus;

  @Field(() => Date, { nullable: true })
  publishedAt: Date | null;

  /** "Dilnoza R." — who saved it last */
  @Field(() => String)
  editedBy: string;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType()
export class SiteTeacherRef {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => LocalizedText)
  role: LocalizedText;
}

@ObjectType()
export class SiteProgramAdmin {
  @Field(() => String)
  id: string;

  @Field(() => SiteProgramCategory)
  category: SiteProgramCategory;

  @Field(() => LocalizedText)
  name: LocalizedText;

  @Field(() => Int)
  gradeFrom: number;

  @Field(() => Int)
  gradeTo: number;

  @Field(() => LocalizedText, { nullable: true })
  levelNote: LocalizedText | null;

  @Field(() => [String])
  days: string[];

  @Field(() => String, { nullable: true })
  startTime: string | null;

  @Field(() => String, { nullable: true })
  endTime: string | null;

  @Field(() => String, { nullable: true })
  room: string | null;

  @Field(() => [SiteTeacherRef])
  teachers: SiteTeacherRef[];

  @Field(() => LocalizedText)
  description: LocalizedText;

  @Field(() => String, { nullable: true })
  photoUrl: string | null;

  @Field(() => String, { nullable: true })
  videoUrl: string | null;

  @Field(() => Boolean)
  showOnSite: boolean;

  @Field(() => Int)
  order: number;

  @Field(() => String, { nullable: true })
  editedBy: string | null;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType()
export class SitePersonAdmin {
  @Field(() => String)
  id: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => LocalizedText)
  role: LocalizedText;

  @Field(() => LocalizedText, { nullable: true })
  note: LocalizedText | null;

  @Field(() => Boolean)
  isDirector: boolean;

  @Field(() => String, { nullable: true })
  photoUrl: string | null;

  @Field(() => Boolean)
  showOnSite: boolean;

  @Field(() => Int)
  order: number;
}

@ObjectType()
export class SiteMockTestAdmin {
  @Field(() => String)
  id: string;

  @Field(() => SiteMockExam)
  exam: SiteMockExam;

  @Field(() => LocalizedText)
  title: LocalizedText;

  @Field(() => LocalizedText)
  included: LocalizedText;

  @Field(() => String)
  examDate: string;

  @Field(() => String)
  startTime: string;

  @Field(() => Int)
  durationMin: number;

  @Field(() => LocalizedText)
  location: LocalizedText;

  @Field(() => Int)
  price: number;

  @Field(() => Int)
  totalSeats: number;

  @Field(() => Int)
  takenSeats: number;

  @Field(() => SiteTeacherRef, { nullable: true })
  contactPerson: SiteTeacherRef | null;

  /** The phone typed in the drawer (null = the school phone is used) */
  @Field(() => String, { nullable: true })
  contactPhone: string | null;

  @Field(() => Boolean)
  showOnSite: boolean;

  /** The exam day is over in the school timezone (the site no longer shows it) */
  @Field(() => Boolean)
  isPast: boolean;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType()
export class SiteOpenLesson {
  @Field(() => String)
  title: string;

  @Field(() => String)
  youtubeId: string;

  @Field(() => Int, { nullable: true })
  durationSec: number | null;
}

@ObjectType()
export class SiteOpenCourseAdmin {
  @Field(() => String)
  id: string;

  @Field(() => SiteCourseCategory)
  category: SiteCourseCategory;

  @Field(() => LocalizedText)
  title: LocalizedText;

  @Field(() => String, { nullable: true })
  source: string | null;

  @Field(() => LocalizedText, { nullable: true })
  description: LocalizedText | null;

  /** DRAFT or PUBLISHED */
  @Field(() => SitePostStatus)
  status: SitePostStatus;

  @Field(() => [SiteOpenLesson])
  lessons: SiteOpenLesson[];

  /** Sum of the lessons with a known length */
  @Field(() => Int)
  totalDurationSec: number;

  @Field(() => Date)
  updatedAt: Date;
}

/** The student picked in the honor drawer (name and class come from the profile) */
@ObjectType()
export class SiteHonorStudentRef {
  @Field(() => String)
  id: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => String)
  loginId: string;
}

@ObjectType()
export class SiteHonorStudentAdmin {
  @Field(() => String)
  id: string;

  @Field(() => SiteHonorStudentRef)
  student: SiteHonorStudentRef;

  @Field(() => String, { nullable: true })
  className: string | null;

  @Field(() => SiteHonorResult)
  resultType: SiteHonorResult;

  @Field(() => Int, { nullable: true })
  place: number | null;

  @Field(() => String, { nullable: true })
  score: string | null;

  @Field(() => LocalizedText)
  subject: LocalizedText;

  @Field(() => LocalizedText)
  competition: LocalizedText;

  @Field(() => String)
  achievedOn: string;

  @Field(() => String, { nullable: true })
  photoUrl: string | null;

  @Field(() => Boolean)
  parentConsent: boolean;

  @Field(() => Boolean)
  showOnSite: boolean;

  @Field(() => Int)
  order: number;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class EnquiryRow {
  @Field(() => String)
  id: string;

  @Field(() => String)
  parentName: string;

  @Field(() => String)
  phone: string;

  @Field(() => Int, { nullable: true })
  childGrade: number | null;

  @Field(() => String, { nullable: true })
  interest: string | null;

  @Field(() => String)
  locale: string;

  @Field(() => String, { nullable: true })
  userAgent: string | null;

  @Field(() => EnquiryStatus)
  status: EnquiryStatus;

  @Field(() => String, { nullable: true })
  handledBy: string | null;

  @Field(() => Date, { nullable: true })
  handledAt: Date | null;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class EnquiryList {
  @Field(() => [EnquiryRow])
  items: EnquiryRow[];

  /** Per status, before the status filter (search applies) */
  @Field(() => Int)
  new: number;

  @Field(() => Int)
  inProgress: number;

  @Field(() => Int)
  resolved: number;
}

/** "Translate from English": one entry per input text */
@ObjectType()
export class SiteTranslation {
  @Field(() => String)
  uz: string;

  @Field(() => String)
  ru: string;

  @Field(() => String)
  ko: string;
}

// ─────────────────────────── public ───────────────────────────

@ObjectType()
export class SiteStats {
  @Field(() => Int)
  students: number;

  @Field(() => Int)
  teachers: number;

  @Field(() => Int)
  programs: number;

  @Field(() => Int, { nullable: true })
  founded: number | null;
}

@ObjectType()
export class SitePostPublic {
  @Field(() => String)
  id: string;

  @Field(() => SitePostType)
  type: SitePostType;

  @Field(() => String)
  title: string;

  @Field(() => String)
  summary: string;

  @Field(() => String, { nullable: true })
  body: string | null;

  @Field(() => String, { nullable: true })
  coverUrl: string | null;

  /** EVENT: the event day; NEWS: the day it was published ("YYYY-MM-DD") */
  @Field(() => String)
  date: string;

  @Field(() => String, { nullable: true })
  startTime: string | null;

  @Field(() => String, { nullable: true })
  endTime: string | null;

  @Field(() => String, { nullable: true })
  place: string | null;
}

@ObjectType()
export class SiteProgramPublic {
  @Field(() => String)
  id: string;

  @Field(() => SiteProgramCategory)
  category: SiteProgramCategory;

  @Field(() => String)
  name: string;

  @Field(() => Int)
  gradeFrom: number;

  @Field(() => Int)
  gradeTo: number;

  @Field(() => String, { nullable: true })
  levelNote: string | null;

  @Field(() => [String])
  days: string[];

  @Field(() => String, { nullable: true })
  startTime: string | null;

  @Field(() => String, { nullable: true })
  endTime: string | null;

  @Field(() => String)
  description: string;

  @Field(() => String, { nullable: true })
  photoUrl: string | null;

  @Field(() => String, { nullable: true })
  videoUrl: string | null;
}

@ObjectType()
export class SitePersonPublic {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  role: string;

  @Field(() => String, { nullable: true })
  note: string | null;

  @Field(() => String, { nullable: true })
  photoUrl: string | null;
}

@ObjectType()
export class SiteMockTestPublic {
  @Field(() => String)
  id: string;

  @Field(() => SiteMockExam)
  exam: SiteMockExam;

  @Field(() => String)
  title: string;

  @Field(() => String)
  included: string;

  /** "YYYY-MM-DD" */
  @Field(() => String)
  date: string;

  @Field(() => String)
  startTime: string;

  @Field(() => Int)
  durationMin: number;

  @Field(() => String)
  location: string;

  @Field(() => Int)
  price: number;

  /** 0 = "Full" */
  @Field(() => Int)
  seatsLeft: number;

  @Field(() => String, { nullable: true })
  contactName: string | null;

  @Field(() => String, { nullable: true })
  contactRole: string | null;

  @Field(() => String, { nullable: true })
  contactPhone: string | null;
}

@ObjectType()
export class SiteOpenCoursePublic {
  @Field(() => String)
  id: string;

  @Field(() => SiteCourseCategory)
  category: SiteCourseCategory;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  source: string | null;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => [SiteOpenLesson])
  lessons: SiteOpenLesson[];

  @Field(() => Int)
  totalDurationSec: number;
}

@ObjectType()
export class SiteHonorPublic {
  @Field(() => String)
  id: string;

  /** "Madina A." — first name and the last name's initial */
  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  className: string | null;

  @Field(() => SiteHonorResult)
  resultType: SiteHonorResult;

  @Field(() => Int, { nullable: true })
  place: number | null;

  @Field(() => String, { nullable: true })
  score: string | null;

  @Field(() => String)
  subject: string;

  @Field(() => String)
  competition: string;

  @Field(() => String)
  achievedOn: string;

  @Field(() => String, { nullable: true })
  photoUrl: string | null;
}

@ObjectType()
export class SiteContact {
  @Field(() => String)
  schoolName: string;

  @Field(() => String, { nullable: true })
  phone: string | null;

  @Field(() => String, { nullable: true })
  officeHours: string | null;

  @Field(() => String, { nullable: true })
  address: string | null;

  @Field(() => String, { nullable: true })
  metro: string | null;

  @Field(() => String, { nullable: true })
  email: string | null;

  @Field(() => String, { nullable: true })
  telegramUrl: string | null;

  @Field(() => String, { nullable: true })
  instagramUrl: string | null;

  @Field(() => String, { nullable: true })
  youtubeUrl: string | null;
}

/** Everything the public home page shows, in one call (built every few minutes by ISR) */
@ObjectType()
export class SiteHome {
  @Field(() => SiteStats)
  stats: SiteStats;

  @Field(() => [SitePostPublic])
  posts: SitePostPublic[];

  @Field(() => [SiteProgramPublic])
  programs: SiteProgramPublic[];

  @Field(() => SitePersonPublic, { nullable: true })
  director: SitePersonPublic | null;

  @Field(() => [SitePersonPublic])
  team: SitePersonPublic[];

  /** Upcoming mock tests that are on the site, soonest first */
  @Field(() => [SiteMockTestPublic])
  mockTests: SiteMockTestPublic[];

  @Field(() => [SiteOpenCoursePublic])
  openCourses: SiteOpenCoursePublic[];

  /** Only with the parents' consent */
  @Field(() => [SiteHonorPublic])
  honorStudents: SiteHonorPublic[];

  @Field(() => SiteContact)
  contact: SiteContact;
}
