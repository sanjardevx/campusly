import type { GetStaticPaths, GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import { AREA_ROLE, NAV } from '@/libs/components/layout/nav';
import type { Role } from '@/libs/gql/graphql';

const ROLE_AREA = Object.fromEntries(Object.entries(AREA_ROLE).map(([area, role]) => [role, area])) as Record<Role, string>;

/**
 * Server only (it reads the JSON files with `fs`). Import it in pages for getStaticProps and
 * nowhere else: Next.js removes getStaticProps and the imports only it uses from the browser
 * bundle, but not a module that client components import too.
 *
 * getStaticProps, not getServerSideProps: on Vercel the public/ folder is not on the server's
 * file system at runtime. Data comes later from the API in the browser (Apollo).
 */
export const withTranslations =
  (namespaces: string[] = []): GetStaticProps =>
  async ({ locale }) => ({
    props: {
      ...(await serverSideTranslations(locale ?? 'en', [
        'common',
        'errors',
        ...namespaces,
      ])),
    },
  });

/**
 * Catch-all "coming soon" pages (/student/[...section]): only the menu's paths exist, anything else
 * is a real 404. fallback 'blocking' builds a path on its first visit instead of listing them here.
 */
export const comingSoonPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });

export const withComingSoon =
  (role: Role): GetStaticProps =>
  async (ctx) => {
    const section = ctx.params?.section;
    const path = `/${ROLE_AREA[role]}/${Array.isArray(section) ? section.join('/') : ''}`;
    const known = NAV[role].some((s) => s.items.some((i) => i.href === path));
    if (!known) return { notFound: true };
    return withTranslations(['auth'])(ctx);
  };
