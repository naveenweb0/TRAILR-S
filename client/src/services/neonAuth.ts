import { createAuthClient } from '@neondatabase/auth';

function sanitizeAuthUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  return rawUrl
    .trim()
    .replace(/^["'\\]+|["'\\]+$/g, '')
    .replace(/\/+$/, '')
    .replace(/^["'\\]+|["'\\]+$/g, '')
    .replace(/\/+$/, '');
}

const rawNeonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL;
const neonAuthUrl = sanitizeAuthUrl(rawNeonAuthUrl);

export const isNeonAuthConfigured = Boolean(
  neonAuthUrl &&
  neonAuthUrl !== 'https://[your-neon-auth-subdomain].neon.tech' &&
  !neonAuthUrl.includes('[your-neon')
);

// Resolved URL strictly from environment configuration
const resolvedAuthUrl = (isNeonAuthConfigured && neonAuthUrl) ? neonAuthUrl : (typeof window !== 'undefined' ? window.location.origin : '');

export const neonAuthClient = createAuthClient(resolvedAuthUrl);

export interface NeonAuthSessionResult {
  sessionToken?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    image?: string;
  };
}

/**
 * Initiates Google OAuth sign-in flow via Neon Auth (Managed Better Auth).
 * Users are redirected to Google OAuth consent and returned to callbackURL upon authorization.
 */
export async function signInWithNeonGoogle(options: { callbackURL?: string } = {}): Promise<void> {
  const callbackURL = options.callbackURL || `${window.location.origin}/auth/callback`;

  if (!isNeonAuthConfigured) {
    console.warn('Neon Auth URL is using default template. Ensure VITE_NEON_AUTH_URL is defined in client/.env.');
  }

  const result = await neonAuthClient.signIn.social({
    provider: 'google',
    callbackURL,
  });

  if (result?.error) {
    throw new Error(result.error.message || 'Failed to initiate Google OAuth via Neon Auth');
  }

  if (result?.data?.url && typeof window !== 'undefined' && window.location.href !== result.data.url) {
    window.location.href = result.data.url;
  }
}

/**
 * Fetch the current authenticated session from Neon Auth.
 */
export async function getNeonSession() {
  try {
    const res = await neonAuthClient.getSession();
    return res?.data || null;
  } catch (err) {
    console.warn('Neon Auth getSession error:', err);
    return null;
  }
}

/**
 * Signs out of the active Neon Auth session.
 */
export async function signOutNeonAuth(): Promise<void> {
  try {
    await neonAuthClient.signOut();
  } catch (err) {
    console.warn('Neon Auth signOut warning:', err);
  }
}
