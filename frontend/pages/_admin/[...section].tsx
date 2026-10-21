import { ComingSoon } from '@/libs/components/layout/ComingSoon';
import { layoutFor } from '@/libs/components/layout';
import { comingSoonPaths, withComingSoon } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

// Menu pages that later days build; a real page file (e.g. courses.tsx) wins over this catch-all
export const getStaticPaths = comingSoonPaths;
export const getStaticProps = withComingSoon('ADMIN');

const Section: NextPageWithLayout = () => <ComingSoon />;
Section.getLayout = layoutFor('ADMIN');
export default Section;
