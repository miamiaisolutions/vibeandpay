export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.'
    case 'auth/invalid-email':
      return 'That email address looks invalid.'
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 8 characters.'
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Wrong email or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a minute.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.'
    default:
      if (err instanceof Error) return err.message
      return 'Something went wrong. Try again.'
  }
}
