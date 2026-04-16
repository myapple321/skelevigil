import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import {
  fetchOrCreateVaultProgress,
  subscribeVaultProgress,
} from '@/src/firebase/vaultProgressFirestore';
import {
  DEFAULT_VAULT_PROGRESS,
  getVaultProgress,
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
 * - Guest / signed-out: local-only vault progress.
 * - Email/Apple/Google member: fetch + subscribe Firestore progress.
 * - First member login with no cloud doc: seed from local guest progress.
 */
export function useVaultSync({ setProgress, setHydrated, setFirestoreUid }: UseVaultSyncArgs): void {
  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubFs: (() => void) | undefined;
    let cancelled = false;
    let lastMode: 'guest' | 'member' | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubFs) {
        unsubFs();
        unsubFs = undefined;
      }

      // Guest mode is local-only, same as signed-out.
      if (!user || user.isAnonymous) {
        setFirestoreUid(null);
        // Avoid repeatedly reloading stale storage while already in guest mode,
        // which can overwrite fresh in-memory vault updates after mission events.
        if (lastMode === 'guest') {
          setHydrated(true);
          return;
        }
        lastMode = 'guest';
        setHydrated(false);
        void getVaultProgress().then((loaded) => {
          if (cancelled) return;
          setProgress(loaded);
          setHydrated(true);
        });
        return;
      }

      lastMode = 'member';
      setFirestoreUid(user.uid);
      setHydrated(false);

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
