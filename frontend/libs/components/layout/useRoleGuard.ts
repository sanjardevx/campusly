import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useReactiveVar } from '@apollo/client/react';
import { sessionReadyVar, userVar } from '@/apollo/store';
import type { SessionUser } from '@/libs/auth/api';
import { cameFromHistory, isSigningOut } from '@/libs/auth/navigation';
import { homeFor } from '@/libs/auth/routes';
import type { Role } from '@/libs/gql/graphql';

/**
 * Frontend route guard (comfort only: the API checks roles and records itself).
 * Returns the user once they may see the page; until then null, so nothing protected flashes.
 */
export function useRoleGuard(role: Role): SessionUser | null {
  const router = useRouter();
  const user = useReactiveVar(userVar);
  const ready = useReactiveVar(sessionReadyVar);

  const allowed = !!user && user.role === role && !user.mustChangePassword;

  useEffect(() => {
    if (!ready || allowed) return;
    if (!user) {
      // Signing out: its own redirect goes to the sign-in page
      if (isSigningOut()) return;
      // Staff sign in on the teacher portal, students and parents on the main page
      const login = role === 'TEACHER' || role === 'ADMIN' ? '/login/teacher' : '/login';
      const signIn = () => void router.replace({ pathname: login, query: { next: router.asPath } });
      if (cameFromHistory()) {
        // Back after signing out: step over the old session's pages; if there is nothing to go
        // back to (the tab opened here), the sign-in page after all
        const here = window.location.href;
        router.back();
        window.setTimeout(() => {
          if (window.location.href === here) signIn();
        }, 400);
        return;
      }
      signIn();
    } else if (user.mustChangePassword) {
      void router.replace('/password');
    } else {
      // Another role's page: back to your own home
      void router.replace(homeFor(user.role));
    }
  }, [ready, allowed, user, role, router]);

  return allowed ? user : null;
}
