import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  type Auth,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { firebaseConfig } from '@/src/firebase/firebaseConfig';

function getFirebaseApp() {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

let authSingleton: Auth | null = null;
let firestoreSingleton: Firestore | null = null;

export function getFirebaseAuth(): Auth {
  if (authSingleton) return authSingleton;
  const app = getFirebaseApp();
  try {
    authSingleton = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    authSingleton = getAuth(app);
  }
  return authSingleton;
}

export function getFirebaseFirestore(): Firestore {
  if (firestoreSingleton) return firestoreSingleton;
  const app = getFirebaseApp();
  try {
    // WebChannel Listen streams often log transport warnings on iOS/RN; long polling is more stable.
    firestoreSingleton = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    firestoreSingleton = getFirestore(app);
  }
  return firestoreSingleton;
}
