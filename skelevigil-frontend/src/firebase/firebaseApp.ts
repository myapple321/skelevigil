import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  type Auth,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { firebaseConfig } from '@/src/firebase/firebaseConfig';

function getFirebaseApp() {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

let authSingleton: Auth | null = null;

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
