import { FirebaseError } from 'firebase/app';

export function mapAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'That email address does not look valid.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found for this email.';
      case 'auth/wrong-password':
        return 'Wrong email or password.';
      case 'auth/invalid-credential':
        return 'Wrong email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/operation-not-allowed':
        return 'Email sign-in is not enabled for this project.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email using another sign-in method. Use that method, or complete linking when prompted.';
      case 'auth/requires-recent-login':
        return 'For your security, sign out and sign in again, then try this action once more.';
      default:
        return error.message || 'Something went wrong. Please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
