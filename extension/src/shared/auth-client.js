import { initializeApp, getApps } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { FIREBASE_CONFIG, FLASK_AUTH_BASE_URL } from './constants.js';
import { clearAuthSession, getAuthSession, saveAuthSession } from './storage.js';

let firebaseAppInstance = null;
let firebaseAuthInstance = null;

function getFirebaseAuth() {
  if (firebaseAuthInstance) {
    return firebaseAuthInstance;
  }

  firebaseAppInstance = getApps()[0] || initializeApp(FIREBASE_CONFIG);
  firebaseAuthInstance = getAuth(firebaseAppInstance);
  return firebaseAuthInstance;
}

async function parseJsonSafe(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function requestFlask(path, options = {}) {
  const response = await fetch(`${FLASK_AUTH_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data || {};
}

export async function fetchUserProfile(accessToken) {
  const data = await requestFlask('/api/user/profile', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return data?.user || null;
}

export async function signUpWithFirebase({ email, password }) {
  const auth = getFirebaseAuth();
  const credentials = await createUserWithEmailAndPassword(auth, email, password);

  await sendEmailVerification(credentials.user);
  await signOut(auth);

  return {
    email: credentials.user.email || email,
    notice: 'Account created. Please verify your email before logging in.'
  };
}

export async function loginWithFirebaseAndFlask({ email, password }) {
  const auth = getFirebaseAuth();
  const credentials = await signInWithEmailAndPassword(auth, email, password);

  if (!credentials.user.emailVerified) {
    await signOut(auth);
    throw new Error('Verify your email first, then log in.');
  }

  const firebaseIdToken = await credentials.user.getIdToken();
  return exchangeFirebaseTokenForSession({
    firebaseIdToken,
    fallbackEmail: credentials.user.email || email,
    fallbackProvider: 'firebase'
  });
}

async function exchangeFirebaseTokenForSession({ firebaseIdToken, fallbackEmail, fallbackProvider }) {
  const authData = await requestFlask('/api/auth/firebase-login', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${firebaseIdToken}`
    }
  });

  const accessToken = authData.access || '';
  const refreshToken = authData.refresh || '';

  if (!accessToken) {
    throw new Error('Login succeeded but no access token was returned.');
  }

  const user = await fetchUserProfile(accessToken).catch(() => null);
  const session = {
    accessToken,
    refreshToken,
    user: {
      ...(user || {}),
      email: user?.email || fallbackEmail || '',
      provider: user?.provider || fallbackProvider || 'firebase'
    },
    loggedInAt: new Date().toISOString()
  };

  await saveAuthSession(session);
  return session;
}

export async function loginWithGoogleAndFlask() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  const credentials = await signInWithPopup(auth, provider);
  const firebaseIdToken = await credentials.user.getIdToken();

  return exchangeFirebaseTokenForSession({
    firebaseIdToken,
    fallbackEmail: credentials.user.email || '',
    fallbackProvider: 'google'
  });
}

export async function sendFirebasePasswordReset(email) {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
}

export async function logoutFromFirebaseAndFlask() {
  const auth = getFirebaseAuth();
  const session = await getAuthSession();

  try {
    if (session.accessToken) {
      await requestFlask('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      });
    }
  } catch {
    // Logout blacklist is best-effort; always clear the local session.
  }

  try {
    await signOut(auth);
  } catch {
    // Clearing the extension session matters more than the Firebase local cache here.
  }

  await clearAuthSession();
}
