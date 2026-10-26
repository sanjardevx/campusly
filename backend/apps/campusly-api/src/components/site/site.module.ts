import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { llmProviderFactory } from '../tutor/llm/llm.factory';
import { TutorLimitsService } from '../tutor/tutor-limits.service';
import { EnquiryService } from './enquiry.service';
import { SiteAdminResolver } from './site-admin.resolver';
import { SiteImages } from './site-images';
import { SitePersonService } from './site-person.service';
import { SitePostService } from './site-post.service';
import { SiteProgramService } from './site-program.service';
import { SitePublicResolver } from './site-public.resolver';
import { SitePublicService } from './site-public.service';
import { SiteTranslateService } from './site-translate.service';

// Public website + CMS (day 19). "Translate from English" uses the tutor's model and budget.
@Module({
  imports: [MediaModule],
  providers: [
    SiteImages,
    SitePostService,
    SiteProgramService,
    SitePersonService,
    EnquiryService,
    SitePublicService,
    SiteTranslateService,
    llmProviderFactory,
    TutorLimitsService,
    SiteAdminResolver,
    SitePublicResolver,
  ],
})
export class SiteModule {}
