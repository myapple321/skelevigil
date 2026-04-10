import { onAuthStateChanged, type User } from 'firebase/auth';

import { getFirebaseAuth } from '@/src/firebase/firebaseApp';

/**
 * Resolves the Firebase user after persistence has had time to restore (notification cold-open).
 * The first `onAuthStateChanged` emission can be `null` briefly before `currentUser` is hydrated.
 */
export async function resolveAuthUserForClaim(): Promise<User | null> {
  const auth = getFirebaseAuth();

  const first = await new Promise<User | null>((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });

  if (first) return first;

  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const u = auth.currentUser;
    if (u) return u;
  }

  return null;
}
