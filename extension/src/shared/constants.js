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
  endpoint: '',
  enabled: false
};
