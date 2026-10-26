import type { AdminSitePostsQuery } from '@/libs/gql/graphql';

type Post = AdminSitePostsQuery['adminSitePosts'][number];
type T = (key: string, options?: Record<string, unknown>) => string;

/** News older than this counts as "past" in the list filter (events: their day has gone) */
const RECENT_DAYS = 60;

const today = () => new Date().toISOString().slice(0, 10);

/** An event whose day has gone, or old news */
export function isPast(post: Post): boolean {
  if (post.type === 'EVENT') return !!post.eventDate && post.eventDate < today();
  return !!post.publishedAt && Date.now() - new Date(post.publishedAt).getTime() > RECENT_DAYS * 86_400_000;
}

/** The status pill of the list and the drawer: Published / Scheduled · Oct 20, 09:00 / Draft / Past */
export function postStatus(post: Post, locale: string, t: T): { tone: 'green' | 'amber' | 'grey'; label: string } {
  if (post.status === 'DRAFT') return { tone: 'grey', label: t('site.posts.status.draft') };
  if (post.publishedAt && new Date(post.publishedAt).getTime() > Date.now()) {
    const when = new Intl.DateTimeFormat(locale === 'uz' ? 'ru' : locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(post.publishedAt));
    return { tone: 'amber', label: t('site.posts.status.scheduled', { when }) };
  }
  if (isPast(post)) return { tone: 'grey', label: t('site.posts.status.past') };
  return { tone: 'green', label: t('site.posts.status.published') };
}
