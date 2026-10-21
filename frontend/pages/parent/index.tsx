import { RoleHomePlaceholder } from '@/libs/components/RoleHomePlaceholder';
import { withTranslations } from '@/libs/i18n/server';

export const getStaticProps = withTranslations(['auth']);

export default function Home() {
  return <RoleHomePlaceholder />;
}
