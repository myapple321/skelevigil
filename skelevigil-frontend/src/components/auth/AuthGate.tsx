import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter, useRootNavigationState, useSegments } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';

import { getFirebaseAuth } from '@/src/firebase/firebaseApp';

type Props = {
  children: ReactNode;
};

export function AuthGate({ children }: Props) {
  const auth = getFirebaseAuth();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const rootNavigation = useRootNavigationState();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
    });
    return unsub;
  }, [auth]);

  useEffect(() => {
    if (user === undefined) return;
    if (!rootNavigation?.key) return;
    if (!segments?.length) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)');
    } else if (user && inAuthGroup) {
      router.replace('/(main)/phases');
    }
  }, [user, segments, rootNavigation?.key, router]);

  return <>{children}</>;
}
