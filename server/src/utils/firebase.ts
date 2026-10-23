import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let firebaseApp: App | null = null;

export function getFirebaseAdmin(): App | null {
  if (firebaseApp) {
    return firebaseApp;
  }

  const apps = getApps();
  if (apps.length > 0) {
    firebaseApp = apps[0];
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (projectId && clientEmail && privateKey) {
    try {
      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin SDK initialized successfully with service account credentials.');
      return firebaseApp;
    } catch (err) {
      console.error('Failed to initialize Firebase Admin with service account:', err);
    }
  }

  // Attempt default application credentials if available
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      firebaseApp = initializeApp();
      console.log('Firebase Admin SDK initialized with GOOGLE_APPLICATION_CREDENTIALS.');
      return firebaseApp;
    } catch (err) {
      console.error('Failed to initialize Firebase Admin with application credentials:', err);
    }
  }

  return null;
}

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
}

export async function verifyFirebaseToken(idToken: string): Promise<VerifiedFirebaseUser> {
  const app = getFirebaseAdmin();

  // Test / local dev mock bypass support if explicitly running tests or configured for local dev testing
  if (!app) {
    if (process.env.NODE_ENV === 'test' || process.env.ALLOW_DEV_FIREBASE_MOCK === 'true') {
      if (idToken.startsWith('test-firebase-token-')) {
        const parts = idToken.split(':');
        const uid = parts[1] || 'mock-google-uid-123';
        const email = parts[2] || 'test-google-user@example.com';
        const name = parts[3] || 'Google Verified User';
        return {
          uid,
          email,
          name,
          emailVerified: true,
        };
      }
    }

    throw new Error(
      'Firebase Admin SDK is not initialized. Please configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in server/.env'
    );
  }

  try {
    const auth = getAuth(app);
    const decodedToken = await auth.verifyIdToken(idToken);
    if (!decodedToken.email) {
      throw new Error('Firebase token does not contain a verified email address.');
    }

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      emailVerified: decodedToken.email_verified || false,
    };
  } catch (err: any) {
    throw new Error(`Invalid Firebase ID token: ${err.message || 'Token verification failed'}`);
  }
}
