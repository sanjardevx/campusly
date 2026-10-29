import { useState } from 'react';
import { useRouter } from 'next/router';
import { useApolloClient } from '@apollo/client/react';
import type { Role } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import { logInDemo, logOut } from './index';
import { AuthError } from './api';
import { whileSigningOut } from './navigation';
import { homeFor } from './routes';

/**
 * The four "Live demo" doors (DECISIONS §12, demo v2). `key` is also the deep link:
 * /login?demo=teacher opens the teacher demo at once.
 */
export const DEMO_ENTRIES = [
  { key: 'student9a', role: 'STUDENT', className: '9A' },
  { key: 'student11a', role: 'STUDENT', className: '11A' },
  { key: 'parent', role: 'PARENT' },
  { key: 'teacher', role: 'TEACHER' },
] as const satisfies readonly { key: string; role: Role; className?: string }[];

export type DemoEntry = (typeof DEMO_ENTRIES)[number];
export type DemoKey = DemoEntry['key'];

/** ?demo=student9a (or just "student" = 9A) → the entry; anything else → undefined */
export function demoFromQuery(value: unknown): DemoEntry | undefined {
  const key = value === 'student' ? 'student9a' : value;
  return DEMO_ENTRIES.find((e) => e.key === key);
}

/** The entry of the signed-in demo account: students by their class */
export function demoOf(user: { role: Role; className: string | null }): DemoEntry | undefined {
  return DEMO_ENTRIES.find(
    (e) => e.role === user.role && (!('className' in e) || e.className === user.className),
  );
}

/**
 * Opens a demo account and goes to its home. From inside the portal (role switch) the current
 * session is signed out first, so its refresh token is revoked and the cache holds nothing of it.
 */
export function useOpenDemo() {
  const router = useRouter();
  const client = useApolloClient();
  const errorText = useErrorText();
  const [busy, setBusy] = useState<DemoKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (entry: DemoEntry, { switching = false } = {}) => {
    setBusy(entry.key);
    setError(null);
    try {
      // The role guard waits while the old user is gone and the new one is not here yet
      await whileSigningOut(async () => {
        if (switching) await logOut(client);
        const user = await logInDemo(entry.role, 'className' in entry ? entry.className : undefined);
        await router.replace(homeFor(user.role));
      });
    } catch (err) {
      setError(errorText(err instanceof AuthError ? err.code : undefined));
      if (switching) await router.replace('/login');
    } finally {
      setBusy(null);
    }
  };

  return { open, busy, error };
}
