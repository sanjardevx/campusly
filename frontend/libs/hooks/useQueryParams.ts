import { useRouter } from 'next/router';

type Params = Record<string, string | undefined>;

/**
 * Page state kept in the URL (?role=TEACHER&page=2): it survives a reload and can be shared as a
 * link. `set` merges a patch, drops empty values and goes back to page 1 unless the page itself
 * changes (a new filter on page 5 could otherwise show an empty page).
 */
export function useQueryParams() {
  const router = useRouter();
  const params: Params = {};
  for (const [key, value] of Object.entries(router.query)) {
    if (typeof value === 'string') params[key] = value;
  }

  const set = (patch: Params) => {
    const next: Params = { ...params, ...patch };
    if (!('page' in patch)) delete next.page;
    for (const key of Object.keys(next)) if (!next[key]) delete next[key];
    // replace + shallow: no history entry per keystroke, no getStaticProps round trip
    void router.replace({ pathname: router.pathname, query: next }, undefined, { shallow: true });
  };

  return [params, set] as const;
}
