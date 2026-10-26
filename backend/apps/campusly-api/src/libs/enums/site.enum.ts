import { registerEnumType } from '@nestjs/graphql';
import {
  EnquiryStatus,
  SitePostStatus,
  SitePostType,
  SiteProgramCategory,
} from '../../../../../generated/prisma/enums';

// Defined in prisma/schema.prisma; registered here for GraphQL
registerEnumType(SitePostType, { name: 'SitePostType' });
registerEnumType(SitePostStatus, { name: 'SitePostStatus' });
registerEnumType(SiteProgramCategory, { name: 'SiteProgramCategory' });
registerEnumType(EnquiryStatus, { name: 'EnquiryStatus' });

/** "Publish now" / "Schedule" / "Save as draft" in the post drawer */
export enum SitePublishMode {
  NOW = 'NOW',
  SCHEDULE = 'SCHEDULE',
  DRAFT = 'DRAFT',
}
registerEnumType(SitePublishMode, { name: 'SitePublishMode' });

/** The languages of the public site; English is required, the rest fall back to it */
export enum SiteLocale {
  en = 'en',
  uz = 'uz',
  ru = 'ru',
  ko = 'ko',
}
registerEnumType(SiteLocale, { name: 'SiteLocale' });

export { EnquiryStatus, SitePostStatus, SitePostType, SiteProgramCategory };
