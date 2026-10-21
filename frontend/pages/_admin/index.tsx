import { ComingSoon } from '@/libs/components/layout/ComingSoon';
import { layoutFor } from '@/libs/components/layout';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['auth']);

const Home: NextPageWithLayout = () => <ComingSoon />;
Home.getLayout = layoutFor('ADMIN');
export default Home;
