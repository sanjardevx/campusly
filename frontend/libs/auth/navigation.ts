/**
 * Two moments the role guard must not answer with "sign in, then come back here":
 *
 * - While signing out: the user clears first, so the page just left would send the visitor to
 *   the sign-in page with ?next= pointing back into it. The sign-out makes its own redirect.
 * - Back after signing out: the browser history still holds the old session's portal pages.
 *   Each would bounce to the sign-in page (one Back per page), so the guard steps back over them
 *   and one Back reaches the page before the portal.
 *
 * Imported by _app, so the popstate listener exists before the first Back.
 */
let poppedAt = 0;
let signingOut = false;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    poppedAt = Date.now();
  });
}

/** The page on screen was reached with the browser's Back / Forward a moment ago */
export const cameFromHistory = () => Date.now() - poppedAt < 1500;

export const isSigningOut = () => signingOut;

/** Runs the sign-out with the guard on hold until its own redirect is done */
export async function whileSigningOut(work: () => Promise<unknown>) {
  signingOut = true;
  try {
    await work();
  } finally {
    signingOut = false;
  }
}
