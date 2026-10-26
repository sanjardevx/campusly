import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  EnquiryStatus,
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

  @Field(() => SiteContact)
  contact: SiteContact;
}
