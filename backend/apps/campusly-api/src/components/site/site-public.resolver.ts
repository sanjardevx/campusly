import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { Request } from 'express';
import { SiteHome } from '../../libs/dto/site/site';
import { SubmitEnquiryInput } from '../../libs/dto/site/site.input';
import { SiteLocale } from '../../libs/enums/site.enum';
import { Public } from '../auth/decorators/auth.decorators';
import { EnquiryService } from './enquiry.service';
import { SitePublicService } from './site-public.service';

/** The public website: no sign-in. Only published content leaves the server. */
@Resolver()
export class SitePublicResolver {
  constructor(
    private readonly site: SitePublicService,
    private readonly enquiries: EnquiryService,
  ) {}

  @Public()
  @Query(() => SiteHome)
  public siteHome(
    @Args('locale', { type: () => SiteLocale }) locale: SiteLocale,
  ): Promise<SiteHome> {
    return this.site.home(locale);
  }

  /** "Send enquiry": rate limited per IP, with a honeypot (EnquiryService) */
  @Public()
  @Mutation(() => Boolean)
  public submitEnquiry(
    @Args('input') input: SubmitEnquiryInput,
    @Context('req') req: Request,
  ): Promise<boolean> {
    return this.enquiries.submit(input, {
      ip: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'],
    });
  }
}
