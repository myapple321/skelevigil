import type { User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseFirestore } from '@/src/firebase/firebaseApp';

const USERS_COLLECTION = 'users';

export type PrimaryAuthKind = 'apple' | 'google' | 'email' | 'unknown';

/**
 * Apple / Google take precedence over password when multiple providers are linked,
 * so Hide My Email and OAuth emails stay the source of truth for display rules.
 */
export function resolvePrimaryAuthKind(user: User | null): PrimaryAuthKind {
  if (!user) return 'unknown';
  const ids = user.providerData.map((p) => p.providerId);
  if (ids.includes('apple.com')) return 'apple';
  if (ids.includes('google.com')) return 'google';
  if (ids.includes('password')) return 'email';
  return 'unknown';
}

/** Apple or Google linked — contact email is owned by the identity provider (including relay). */
export function isEmailManagedBySocialProvider(user: User | null): boolean {
  if (!user) return false;
  return user.providerData.some(
    (p) => p.providerId === 'apple.com' || p.providerId === 'google.com',
  );
}

/** Badge + Firestore `isVerified`: OAuth emails are treated as verified when present; email/password uses Firebase flag. */
export function computeProfileEmailVerified(user: User | null): boolean {
  if (!user?.email) return false;
  if (isEmailManagedBySocialProvider(user)) return true;
  return user.emailVerified;
}

function primaryProviderId(user: User): string {
  return user.providerData[0]?.providerId ?? user.providerId ?? 'unknown';
}

/**
 * Merges auth-derived profile fields into `users/{uid}` (notifications + admin source of truth).
 * Call after sign-in and after `reload()` when email may have changed.
 */
export async function syncUserProfileMirrorFromAuth(uid: string): Promise<void> {
  const u = getFirebaseAuth().currentUser;
  if (!u || u.uid !== uid || u.isAnonymous) return;

  const primaryKind = resolvePrimaryAuthKind(u);
  const isVerified =
    primaryKind === 'apple' || primaryKind === 'google'
      ? Boolean(u.email?.length)
      : u.emailVerified;

  await setDoc(
    doc(getFirebaseFirestore(), USERS_COLLECTION, uid),
    {
      email: u.email ?? null,
      emailVerified: u.emailVerified,
      isVerified,
      authProvider: primaryProviderId(u),
      primaryAuthKind: primaryKind,
      lastProfileSync: serverTimestamp(),
    },
    { merge: true },
  );
}
