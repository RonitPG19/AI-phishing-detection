export const PROVIDERS = {
  GMAIL: 'gmail',
  OUTLOOK: 'outlook'
};

// Message names shared between popup, content scripts, and the background service worker.
export const RUNTIME_MESSAGES = {
  REQUEST_ACTIVE_SCAN: 'request-active-scan',
  SCAN_EMAIL: 'scan-email'
};

export const DEFAULT_API_CONFIG = {
  endpoint: 'http://127.0.0.1:8080/api/phishing/scan',
  enabled: true
};

export const DEFAULT_AUTH_CONFIG = {
  baseUrl: 'http://127.0.0.1:5001'
};

export const FLASK_AUTH_BASE_URL = 'http://127.0.0.1:5001';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC07-2Lf1Cn0mT9WECIAcEELtR3v7sOHzk',
  authDomain: 'tribunal-ai.firebaseapp.com',
  projectId: 'tribunal-ai',
  storageBucket: 'tribunal-ai.firebasestorage.app',
  messagingSenderId: '471298955614',
  appId: '1:471298955614:web:43c54fcd05578aca9a17cf'
};
