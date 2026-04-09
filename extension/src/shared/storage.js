import { DEFAULT_API_CONFIG, DEFAULT_AUTH_CONFIG } from './constants.js';

// Centralize storage keys here so popup, content scripts, and background stay in sync.
const STORAGE_KEYS = {
  API_CONFIG: 'tribunal_api_config',
  AUTH_CONFIG: 'tribunal_auth_config',
  AUTH_SESSION: 'tribunal_auth_session',
  SCAN_HISTORY: 'tribunal_history',
  WIDGET_STATE: 'tribunal_widget_state',
  WIDGET_PREFERENCES: 'tribunal_widget_preferences',
  LAST_SCAN_DEBUG: 'tribunal_last_scan_debug'
};

const MAX_HISTORY_ENTRIES = 50;

const DEFAULT_WIDGET_STATE = {
  minimized: false,
  position: null
};

const DEFAULT_WIDGET_PREFERENCES = {
  enabled: true
};

const DEFAULT_SCAN_DEBUG = {
  payload: null,
  result: null,
  updatedAt: null
};

const DEFAULT_SCAN_HISTORY = [];

const DEFAULT_AUTH_SESSION = {
  accessToken: '',
  refreshToken: '',
  user: null,
  loggedInAt: null
};

export async function getApiConfig() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.API_CONFIG);
  const storedConfig = result[STORAGE_KEYS.API_CONFIG] || {};

  return {
    ...DEFAULT_API_CONFIG,
    ...storedConfig,
    endpoint: String(storedConfig.endpoint || '').trim() || DEFAULT_API_CONFIG.endpoint,
    enabled: typeof storedConfig.enabled === 'boolean' ? storedConfig.enabled : DEFAULT_API_CONFIG.enabled
  };
}

export async function saveApiConfig(config) {
  await chrome.storage.local.set({ [STORAGE_KEYS.API_CONFIG]: config });
}

export async function getAuthConfig() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH_CONFIG);
  return {
    ...DEFAULT_AUTH_CONFIG,
    ...(result[STORAGE_KEYS.AUTH_CONFIG] || {})
  };
}

export async function saveAuthConfig(config) {
  const currentConfig = await getAuthConfig();
  await chrome.storage.local.set({
    [STORAGE_KEYS.AUTH_CONFIG]: {
      ...currentConfig,
      ...config
    }
  });
}

export async function getAuthSession() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH_SESSION);
  return {
    ...DEFAULT_AUTH_SESSION,
    ...(result[STORAGE_KEYS.AUTH_SESSION] || {})
  };
}

export async function saveAuthSession(session) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.AUTH_SESSION]: {
      ...DEFAULT_AUTH_SESSION,
      ...session
    }
  });
}

export async function clearAuthSession() {
  await chrome.storage.local.remove(STORAGE_KEYS.AUTH_SESSION);
}

export async function getScanHistory() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SCAN_HISTORY);
  const history = result[STORAGE_KEYS.SCAN_HISTORY];
  return Array.isArray(history) ? history : DEFAULT_SCAN_HISTORY;
}

export async function saveScanHistory(history) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.SCAN_HISTORY]: Array.isArray(history)
      ? history.slice(0, MAX_HISTORY_ENTRIES)
      : DEFAULT_SCAN_HISTORY
  });
}

export async function addScanHistoryEntry(entry) {
  const history = await getScanHistory();
  history.unshift(entry);
  await saveScanHistory(history);
}

export async function clearScanHistory() {
  await chrome.storage.local.remove(STORAGE_KEYS.SCAN_HISTORY);
}

export async function getWidgetState() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.WIDGET_STATE);
  return {
    ...DEFAULT_WIDGET_STATE,
    ...(result[STORAGE_KEYS.WIDGET_STATE] || {})
  };
}

export async function saveWidgetState(state) {
  const currentState = await getWidgetState();

  // Merge partial state updates so drag and minimize changes do not overwrite each other.
  await chrome.storage.local.set({
    [STORAGE_KEYS.WIDGET_STATE]: {
      ...currentState,
      ...state
    }
  });
}

export async function getWidgetPreferences() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.WIDGET_PREFERENCES);
  return {
    ...DEFAULT_WIDGET_PREFERENCES,
    ...(result[STORAGE_KEYS.WIDGET_PREFERENCES] || {})
  };
}

export async function saveWidgetPreferences(preferences) {
  // Preferences are shared by popup controls and content scripts, so always merge.
  const currentPreferences = await getWidgetPreferences();

  await chrome.storage.local.set({
    [STORAGE_KEYS.WIDGET_PREFERENCES]: {
      ...currentPreferences,
      ...preferences
    }
  });
}

export async function getLastScanDebug() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_SCAN_DEBUG);
  return {
    ...DEFAULT_SCAN_DEBUG,
    ...(result[STORAGE_KEYS.LAST_SCAN_DEBUG] || {})
  };
}

export async function saveLastScanDebug(debugData) {
  // Keep only the latest payload/result pair; this is for inspection, not long-term history.
  await chrome.storage.local.set({
    [STORAGE_KEYS.LAST_SCAN_DEBUG]: {
      ...DEFAULT_SCAN_DEBUG,
      ...debugData,
      updatedAt: debugData.updatedAt || new Date().toISOString()
    }
  });
}
