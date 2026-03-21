// Centralize storage keys here so popup, content scripts, and background stay in sync.
const STORAGE_KEYS = {
  API_CONFIG: 'tribunal_api_config',
  WIDGET_STATE: 'tribunal_widget_state',
  WIDGET_PREFERENCES: 'tribunal_widget_preferences',
  LAST_SCAN_DEBUG: 'tribunal_last_scan_debug'
};

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

export async function getApiConfig() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.API_CONFIG);
  return result[STORAGE_KEYS.API_CONFIG] || { endpoint: '', enabled: false };
}

export async function saveApiConfig(config) {
  await chrome.storage.local.set({ [STORAGE_KEYS.API_CONFIG]: config });
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
