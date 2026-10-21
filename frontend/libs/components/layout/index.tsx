import type { ReactElement } from 'react';
import type { Role } from '@/libs/gql/graphql';
import { AppShell } from './AppShell';

/**
 * page.getLayout = layoutFor('STUDENT'). Every page of an area returns the same <AppShell>, so React
 * keeps it (and its queries) when the user moves between those pages; only the content changes.
 */
export const layoutFor = (role: Role) =>
  function RoleLayout(page: ReactElement) {
    return <AppShell role={role}>{page}</AppShell>;
  };
