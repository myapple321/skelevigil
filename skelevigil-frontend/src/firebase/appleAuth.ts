import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { OAuthProvider, signInWithCredential, type Auth } from 'firebase/auth';

const NONCE_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';

async function randomRawNonce(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(bytes, (b) => NONCE_CHARSET[b % NONCE_CHARSET.length]).join('');
}

export function isAppleAuthUserCanceled(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  const code = String((error as { code: unknown }).code);
  return code === 'ERR_REQUEST_CANCELED';
}

/**
 * Native Sign in with Apple → Firebase Auth. Call only on iOS when `isAvailableAsync()` is true.
 */
export async function signInWithAppleForFirebase(auth: Auth): Promise<void> {
  const rawNonce = await randomRawNonce();
  const nonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  const apple = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce,
  });

  if (!apple.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: apple.identityToken,
    rawNonce,
  });

  await signInWithCredential(auth, credential);
}
