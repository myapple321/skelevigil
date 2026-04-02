/**
 * `firebase/auth` TypeScript typings target the browser entry and omit
 * `getReactNativePersistence`. Metro still resolves the RN build at runtime.
 */
import 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): import('firebase/auth').Persistence;
}
