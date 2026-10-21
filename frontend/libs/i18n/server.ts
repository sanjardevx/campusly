import type { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';

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
