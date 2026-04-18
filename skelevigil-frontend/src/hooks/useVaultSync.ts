import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { syncUserProfileMirrorFromAuth } from '@/src/firebase/userProfileMirror';
import {
  fetchOrCreateVaultProgress,
  subscribeVaultProgress,
} from '@/src/firebase/vaultProgressFirestore';
import {
  bootstrapGuestVaultProgress,
  DEFAULT_VAULT_PROGRESS,
  getVaultProgress,
  hasStoredVaultProgressForCurrentUser,
  setVaultProgress,
  type VaultProgress,
} from '@/src/preferences/vaultProgress';

type UseVaultSyncArgs = {
  setProgress: (next: VaultProgress) => void;
  setHydrated: (ready: boolean) => void;
  setFirestoreUid: (uid: string | null) => void;
};

/**
 * Login restoration:
 * - Signed-out: local-only vault progress.
 * - Anonymous guest: local-only vault with one-time initial grant friction gate.
 * - Email/Apple/Google member: fetch + subscribe Firestore progress.
 * - First member login with no cloud doc: seed from local guest progress.
 */
export function useVaultSync({ setProgress, setHydrated, setFirestoreUid }: UseVaultSyncArgs): void {
  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubFs: (() => void) | undefined;
    let cancelled = false;
    let lastMode: 'signedOut' | 'guestAnonymous' | 'member' | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubFs) {
        unsubFs();
        unsubFs = undefined;
      }

      // Signed-out mode is local-only.
      if (!user) {
        setFirestoreUid(null);
        if (lastMode === 'signedOut') {
          setHydrated(true);
          return;
        }
        lastMode = 'signedOut';
        setHydrated(false);
        void getVaultProgress().then((loaded) => {
          if (cancelled) return;
          setProgress(loaded);
          setHydrated(true);
        });
        return;
      }
      // Anonymous guest mode gets a one-time initial grant (best-effort local anti-abuse).
      if (user.isAnonymous) {
        setFirestoreUid(null);
        if (lastMode === 'guestAnonymous') {
          setHydrated(true);
          return;
        }
        lastMode = 'guestAnonymous';
        setHydrated(false);
        void (async () => {
          try {
            const hasStored = await hasStoredVaultProgressForCurrentUser();
            const loaded = hasStored
              ? await getVaultProgress()
              : await bootstrapGuestVaultProgress();
            if (cancelled) return;
            setProgress(loaded);
            setHydrated(true);
          } catch {
            if (cancelled) return;
            setProgress(DEFAULT_VAULT_PROGRESS);
            setHydrated(true);
          }
        })();
        return;
      }

      lastMode = 'member';
      setFirestoreUid(user.uid);
      setHydrated(false);
      void syncUserProfileMirrorFromAuth(user.uid);

      void (async () => {
        try {
          const local = await getVaultProgress();
          if (cancelled) return;
          const initial = await fetchOrCreateVaultProgress(user.uid, local);
          if (cancelled) return;
          setProgress(initial);
          await setVaultProgress(initial);

          unsubFs = subscribeVaultProgress(user.uid, (p) => {
            if (cancelled) return;
            setProgress(p);
            setHydrated(true);
            void setVaultProgress(p);
          });
        } catch {
          if (cancelled) return;
          setFirestoreUid(null);
          setProgress(DEFAULT_VAULT_PROGRESS);
          setHydrated(true);
        }
      })();
    });

    return () => {
      cancelled = true;
      unsubAuth();
      unsubFs?.();
    };
  }, [setFirestoreUid, setHydrated, setProgress]);
}
