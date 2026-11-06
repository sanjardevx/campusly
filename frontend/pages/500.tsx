import { ErrorPage } from '@/libs/components/ErrorPage';
import { withTranslations } from '@/libs/i18n/server';

export const getStaticProps = withTranslations();

export default function ServerError() {
  return <ErrorPage code={500} />;
}
