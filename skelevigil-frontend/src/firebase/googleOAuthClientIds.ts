/**
 * Google OAuth client IDs required for `expo-auth-session/providers/google`.
 *
 * Get these from:
 *  - Firebase Console -> Authentication -> Sign-in method -> Google
 *  - The setup flow shows OAuth client IDs (web / iOS / Android).
 *
 * IMPORTANT:
 * - At minimum, `webClientId` is usually required.
 * - `webClientId` and `iosClientId` are different strings in Google Cloud (Web vs iOS client).
 * - On iOS, use the iOS client ID from APIs & Services → Credentials → your iOS OAuth client.
 *   The redirect must use Google’s reversed scheme (see googleIosRedirectNativeUri), not the
 *   bundle id alone — see app/(auth)/index.tsx + Info.plist URL schemes.
 * - Do NOT set optional ids to '' — Expo treats '' as a real value and skips fallbacks.
 */
export type GoogleOAuthClientIds = {
  webClientId: string;
  iosClientId?: string;
  androidClientId?: string;
};

export const GOOGLE_OAUTH_CLIENT_IDS: GoogleOAuthClientIds = {
  webClientId: '169160923769-io33dsmuei4gmrcuc7njth6fnfn94gpa.apps.googleusercontent.com',
  /** iOS OAuth 2.0 client (bundle com.anonymous.skelevigil-frontend) — not the web client id. */
  iosClientId: '169160923769-u8g05llls6fnkpvoc76mvboaft5c85bp.apps.googleusercontent.com',
};

/** Matches Google Cloud “iOS URL scheme” for this iOS client (REVERSED_CLIENT_ID). */
export function googleIosOAuthRedirectScheme(iosClientId: string): string {
  const idPart = iosClientId.replace(/\.apps\.googleusercontent\.com$/i, '');
  return `com.googleusercontent.apps.${idPart}`;
}

export function googleIosRedirectNativeUri(iosClientId: string): string {
  return `${googleIosOAuthRedirectScheme(iosClientId)}:/oauthredirect`;
}

