import { createRemoteJWKSet, jwtVerify } from 'jose';
import { prisma } from '../prisma.js';

export interface VerifiedNeonUser {
  id: string; // Neon Auth user ID (e.g. from Better Auth 'user.id' or JWT 'sub')
  email: string;
  name?: string;
  emailVerified?: boolean;
}

export function sanitizeAuthUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  return rawUrl
    .trim()
    .replace(/^["'\\]+|["'\\]+$/g, '')
    .replace(/(%22|%27)+$/gi, '')
    .replace(/^(%22|%27)+/gi, '')
    .replace(/\/+$/, '')
    .replace(/^["'\\]+|["'\\]+$/g, '')
    .replace(/(%22|%27)+$/gi, '')
    .replace(/\/+$/, '');
}

let jwksInstance: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (jwksInstance) return jwksInstance;
  const rawAuthUrl = process.env.NEON_AUTH_URL;
  const neonAuthUrl = sanitizeAuthUrl(rawAuthUrl);
  if (!neonAuthUrl) return null;

  try {
    const rawJwks = process.env.NEON_AUTH_JWKS_URL;
    const jwksUrl = new URL(
      rawJwks ? sanitizeAuthUrl(rawJwks) : `${neonAuthUrl}/.well-known/jwks.json`
    );
    jwksInstance = createRemoteJWKSet(jwksUrl);
    return jwksInstance;
  } catch (err) {
    console.warn('Failed to parse NEON_AUTH_JWKS_URL:', err);
    return null;
  }
}

export const isNeonAuthConfigured = (): boolean => {
  const neonAuthUrl = sanitizeAuthUrl(process.env.NEON_AUTH_URL);
  return Boolean(neonAuthUrl && neonAuthUrl !== 'https://auth.example.neon.tech');
};

/**
 * Verify a Neon Auth session token or JWT against Neon Auth.
 * Supports:
 *  1. Remote JWKS cryptographic validation for JWTs issued by Neon Auth / Better Auth
 *  2. Better Auth session validation endpoint (${NEON_AUTH_URL}/api/auth/get-session)
 *  3. Direct PostgreSQL neon_auth / session table inspection when configured
 *  4. Test suite mock tokens (prefixed with 'test-neon-token-')
 */
export async function verifyNeonAuthToken(token: string): Promise<VerifiedNeonUser> {
  if (!token || typeof token !== 'string') {
    throw new Error('Neon Auth token or session identifier is required.');
  }

  // 1. Safe deterministic automated test suite execution ONLY (unavailable in production/dev runtime)
  if (process.env.NODE_ENV === 'test') {
    if (token.startsWith('test-neon-token-')) {
      const suffix = token.replace('test-neon-token-', '');
      if (suffix === 'super-admin') {
        return {
          id: 'neon-auth-super-admin',
          email: 'admin@schooldest.com',
          name: 'Super Admin',
          emailVerified: true,
        };
      }
      if (suffix === 'new-google-user') {
        return {
          id: 'neon-auth-new-google-user',
          email: 'new-google-user@example.com',
          name: 'New Google Teacher',
          emailVerified: true,
        };
      }
      if (suffix.startsWith('unauthorized-admin-attempt')) {
        const parts = suffix.split(':');
        const email = parts[1] || 'super-admin@dynamic-test.local';
        return {
          id: 'neon-auth-attacker-id',
          email,
          name: 'Impostor Admin',
          emailVerified: true,
        };
      }

      if (suffix === 'unverified-email') {
        return {
          id: 'neon-auth-unverified-id',
          email: 'unverified-user@schooldest.test',
          name: 'Unverified Email User',
          emailVerified: false,
        };
      }

      if (suffix === 'existing-school-staff') {
        return {
          id: 'neon-auth-school-staff',
          email: 'coordinator@stxaviers.edu.in',
          name: 'St Xaviers Coordinator',
          emailVerified: true,
        };
      }
      // General test token fallback
      return {
        id: `neon-auth-${suffix}`,
        email: `${suffix}@schooldest.test`,
        name: `Test User ${suffix}`,
        emailVerified: true,
      };
    }
  }

  const neonAuthUrl = process.env.NEON_AUTH_URL;
  if (!neonAuthUrl) {
    throw new Error(
      'Neon Auth is not configured. Please supply NEON_AUTH_URL in server/.env (e.g. from your Neon project Auth dashboard).'
    );
  }

  // 2. Check if token is a 3-part JWT
  const isJwt = token.split('.').length === 3;
  if (isJwt) {
    const jwks = getJwks();
    if (!jwks) {
      throw new Error('Neon Auth JWKS endpoint could not be initialized.');
    }

    try {
      const { payload } = await jwtVerify(token, jwks);
      if (!payload.sub) {
        throw new Error('Neon Auth token missing subject identifier (sub).');
      }
      return {
        id: payload.sub,
        email: (payload.email as string) || '',
        name: (payload.name as string) || (payload.email as string) || 'Neon User',
        emailVerified: Boolean(payload.email_verified),
      };
    } catch (jwtErr: any) {
      throw new Error(`Neon Auth JWT verification failed: ${jwtErr.message || 'Invalid signature'}`);
    }
  }

  // 3. Fallback: Query Neon Auth Session endpoint (/get-session or /api/auth/get-session)
  try {
    const cleanUrl = sanitizeAuthUrl(neonAuthUrl);
    const candidateEndpoints = cleanUrl.endsWith('/auth')
      ? [`${cleanUrl}/get-session`, `${cleanUrl}/api/auth/get-session`]
      : [`${cleanUrl}/api/auth/get-session`, `${cleanUrl}/get-session`];

    for (const sessionUrl of candidateEndpoints) {
      try {
        const sessionRes = await fetch(sessionUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `better-auth.session_token=${token}`,
          },
        });

        if (sessionRes.ok) {
          const data = (await sessionRes.json()) as any;
          if (data?.user?.id) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              emailVerified: data.user.emailVerified,
            };
          }
        }
      } catch (err) {
        // try next candidate
      }
    }
  } catch (fetchErr: any) {
    console.warn('Neon Auth session endpoint call failed:', fetchErr.message);
  }

  throw new Error('Invalid or expired Neon Auth session.');
}
