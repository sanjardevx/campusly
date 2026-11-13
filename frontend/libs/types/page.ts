import type { NextPage } from 'next';
import type { ReactElement, ReactNode } from 'react';

/**
 * A page that brings its own layout. The layout returned here is kept by _app between pages
 * of the same area, so the sidebar is not rebuilt on every click.
 */
export type NextPageWithLayout<P = object> = NextPage<P> & {
  getLayout?: (page: ReactElement) => ReactNode;
};
