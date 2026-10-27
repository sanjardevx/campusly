import type { GetStaticProps } from 'next';
import Head from 'next/head';
import { print } from 'graphql';
import { Box } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { SITE_HOME } from '@/apollo/site/query';
import { SiteEnquiry } from '@/libs/components/site/SiteEnquiry';
import { SiteFooter } from '@/libs/components/site/SiteFooter';
import { SiteHero } from '@/libs/components/site/SiteHero';
import { SiteNews } from '@/libs/components/site/SiteNews';
import { SiteHonorStudents, SiteMockTests, SiteOpenCourses } from '@/libs/components/site/SiteOpenSections';
import { SiteAdmission, SiteFaq, SiteFeatures, SitePrograms, SiteStages, SiteTeam, SiteWhy } from '@/libs/components/site/SiteSections';
import { SITE, type SiteData } from '@/libs/components/site/tokens';
import { API_GRAPHQL_URL } from '@/libs/config';
import type { SiteHomeQuery, SiteLocale } from '@/libs/gql/graphql';
import { withTranslations } from '@/libs/i18n/server';

/** The page is rebuilt on the server at most every 10 minutes (ISR): a CMS change shows within that */
const REVALIDATE_SEC = 600;

/** Only when the API cannot be reached while building: the page still renders, without CMS content */
const EMPTY: SiteData = {
  stats: { students: 0, teachers: 0, programs: 0, founded: null },
  posts: [],
  programs: [],
  director: null,
  team: [],
  mockTests: [],
  openCourses: [],
  honorStudents: [],
  contact: { schoolName: 'Campusly School', phone: null, officeHours: null, address: null, metro: null, email: null, telegramUrl: null, instagramUrl: null, youtubeUrl: null },
};

async function fetchHome(locale: string): Promise<SiteData | null> {
  try {
    const res = await fetch(API_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: print(SITE_HOME), variables: { locale } }),
    });
    const json = (await res.json()) as { data?: SiteHomeQuery };
    return json.data?.siteHome ?? null;
  } catch {
    return null;
  }
}

export const getStaticProps: GetStaticProps<{ site: SiteData }> = async (ctx) => {
  const locale = (ctx.locale ?? 'en') as SiteLocale;
  const [translations, site] = await Promise.all([withTranslations(['site'])(ctx), fetchHome(locale)]);
  return {
    props: { ...('props' in translations ? translations.props : {}), site: site ?? EMPTY },
    // API down: try again soon instead of keeping an empty page for 10 minutes
    revalidate: site ? REVALIDATE_SEC : 60,
  };
};

/**
 * The public school website at / (DECISIONS §14, day 19), built from the Stitch "Campusly Public"
 * landing (Part A, B, C — desktop and mobile). Static content comes from the `site` translations;
 * news, programs, team, numbers and contact from the CMS through `siteHome`. The portal's own front
 * door moved to /portal. Mock tests, Open Courses and Honor Students follow Programs (day 20).
 */
export default function SiteHome({ site }: { site: SiteData }) {
  const { t } = useTranslation('site');
  return (
    <>
      <Head>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <meta property="og:title" content={t('meta.title')} />
        <meta property="og:description" content={t('meta.description')} />
        <meta property="og:image" content="/site/hero-campus.jpg" />
      </Head>
      <Box sx={{ bgcolor: SITE.canvas, color: SITE.text, minHeight: '100vh' }}>
        <SiteHero stats={site.stats} />
        <Box component="main">
          <SiteNews posts={site.posts} />
          <SiteWhy />
          <SiteFeatures />
          <SitePrograms programs={site.programs} />
          <SiteMockTests tests={site.mockTests} />
          <SiteOpenCourses courses={site.openCourses} />
          <SiteHonorStudents honors={site.honorStudents} />
          <SiteTeam director={site.director} team={site.team} />
          <SiteStages />
          <SiteAdmission />
          <SiteEnquiry contact={site.contact} />
          <SiteFaq />
        </Box>
        <SiteFooter contact={site.contact} />
      </Box>
    </>
  );
}
