import { initializeApp, getApps } from "firebase/app"
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth"

const FLASK_AUTH_BASE_URL = "http://127.0.0.1:5001"
const AUTH_SESSION_KEY = "tribunal_admin_auth_session"

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC07-2Lf1Cn0mT9WECIAcEELtR3v7sOHzk",
  authDomain: "tribunal-ai.firebaseapp.com",
  projectId: "tribunal-ai",
  storageBucket: "tribunal-ai.firebasestorage.app",
  messagingSenderId: "471298955614",
  appId: "1:471298955614:web:43c54fcd05578aca9a17cf",
}

let firebaseAppInstance = null
let firebaseAuthInstance = null
let refreshPromise = null

function getFirebaseAuth() {
  if (firebaseAuthInstance) {
    return firebaseAuthInstance
  }

  firebaseAppInstance = getApps()[0] || initializeApp(FIREBASE_CONFIG)
  firebaseAuthInstance = getAuth(firebaseAppInstance)
  return firebaseAuthInstance
}

function parseStoredSession(rawValue) {
  if (!rawValue) return null

  try {
    return JSON.parse(rawValue)
  } catch {
    return null
  }
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null

  const parts = token.split(".")
  if (parts.length < 2) return null

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    return JSON.parse(window.atob(padded))
  } catch {
    return null
  }
}

export function isAccessTokenUsable(token) {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return false

  const expiresAtMs = Number(payload.exp) * 1000
  const safetyWindowMs = 30_000
  return expiresAtMs > Date.now() + safetyWindowMs
}

export function getStoredAuthSession() {
  if (typeof window === "undefined") return null
  return parseStoredSession(window.localStorage.getItem(AUTH_SESSION_KEY))
}

export function saveStoredAuthSession(session) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function clearStoredAuthSession() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(AUTH_SESSION_KEY)
}

async function parseJsonSafe(response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

export async function requestFlask(path, options = {}) {
  const response = await fetch(`${FLASK_AUTH_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })

  const data = await parseJsonSafe(response)

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed with status ${response.status}`
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return data || {}
}

export async function refreshFlaskSession(session = getStoredAuthSession()) {
  if (!session?.refreshToken) {
    clearStoredAuthSession()
    throw new Error("Session expired. Please log in again.")
  }

  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = requestFlask("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh: session.refreshToken }),
  })
    .then((data) => {
      const accessToken = data?.access || ""
      if (!accessToken) {
        throw new Error("Refresh succeeded but no access token was returned.")
      }

      const nextSession = {
        ...session,
        accessToken,
      }
      saveStoredAuthSession(nextSession)
      return nextSession
    })
    .catch((error) => {
      clearStoredAuthSession()
      throw error
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

export async function getReliableAuthSession(session = getStoredAuthSession()) {
  if (!session?.accessToken) {
    clearStoredAuthSession()
    return null
  }

  if (isAccessTokenUsable(session.accessToken)) {
    return session
  }

  return refreshFlaskSession(session)
}

export async function requestFlaskWithAuth(path, options = {}, session = getStoredAuthSession()) {
  const reliableSession = await getReliableAuthSession(session)
  if (!reliableSession?.accessToken) {
    throw new Error("Session expired. Please log in again.")
  }

  try {
    return await requestFlask(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${reliableSession.accessToken}`,
      },
    })
  } catch (error) {
    if (error.status !== 401 || !reliableSession.refreshToken) {
      throw error
    }

    const refreshedSession = await refreshFlaskSession(reliableSession)
    return requestFlask(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${refreshedSession.accessToken}`,
      },
    })
  }
}

function getFirebaseDisplayName(user) {
  return user?.displayName
    || user?.providerData?.find((provider) => provider?.displayName)?.displayName
    || user?._tokenResponse?.displayName
    || ""
}

function getFirebasePhotoUrl(user) {
  return user?.photoURL
    || user?.providerData?.find((provider) => provider?.photoURL)?.photoURL
    || user?._tokenResponse?.photoUrl
    || user?._tokenResponse?.photoURL
    || user?.reloadUserInfo?.photoUrl
    || ""
}

export async function fetchUserProfile(accessToken) {
  const data = await requestFlask("/api/user/profile", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return data?.user || null
}

async function exchangeFirebaseUserWithFlask(user, fallbackEmail) {
  const firebaseIdToken = await user.getIdToken()
  const firebaseDisplayName = getFirebaseDisplayName(user)
  const firebasePhotoUrl = getFirebasePhotoUrl(user)
  const authData = await requestFlask("/api/auth/firebase-login", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firebaseIdToken}`,
    },
  })

  const accessToken = authData.access || ""
  const refreshToken = authData.refresh || ""

  if (!accessToken) {
    throw new Error("Login succeeded but no access token was returned.")
  }

  const profile = await fetchUserProfile(accessToken).catch(() => null)

  const session = {
    accessToken,
    refreshToken,
    user: {
      ...(profile || {}),
      email: profile?.email || user.email || fallbackEmail || "",
      displayName: profile?.displayName || profile?.name || profile?.full_name || firebaseDisplayName,
      photoURL: profile?.photoURL || profile?.photoUrl || profile?.picture || profile?.avatar_url || firebasePhotoUrl,
      provider: profile?.provider || user.providerData?.[0]?.providerId || "firebase",
    },
    loggedInAt: new Date().toISOString(),
  }

  saveStoredAuthSession(session)
  return session
}

export async function signUpWithFirebase({ email, password }) {
  const auth = getFirebaseAuth()
  const credentials = await createUserWithEmailAndPassword(auth, email, password)

  await sendEmailVerification(credentials.user)
  await signOut(auth)

  return {
    email: credentials.user.email || email,
    notice: "Account created. Please verify your email before logging in.",
  }
}

export async function loginWithFirebaseAndFlask({ email, password }) {
  const auth = getFirebaseAuth()
  const credentials = await signInWithEmailAndPassword(auth, email, password)

  if (!credentials.user.emailVerified) {
    await signOut(auth)
    throw new Error("Verify your email first, then log in.")
  }

  return exchangeFirebaseUserWithFlask(credentials.user, email)
}

export async function loginWithGoogleAndFlask() {
  const auth = getFirebaseAuth()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: "select_account" })

  const result = await signInWithPopup(auth, provider)
  return exchangeFirebaseUserWithFlask(result.user, result.user.email || "")
}

export async function sendFirebasePasswordReset(email) {
  const auth = getFirebaseAuth()
  await sendPasswordResetEmail(auth, email)
}

export async function logoutFromFirebaseAndFlask() {
  const auth = getFirebaseAuth()
  const session = getStoredAuthSession()

  try {
    if (session?.accessToken) {
      await requestFlask("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
    }
  } catch {
    // Best-effort backend logout; local logout still matters.
  }

  try {
    await signOut(auth)
  } catch {
    // Ignore Firebase cache cleanup failures in local dev.
  }

  clearStoredAuthSession()
}
