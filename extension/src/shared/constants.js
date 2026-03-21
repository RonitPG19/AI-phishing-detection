export const PROVIDERS = {
  GMAIL: 'gmail',
  OUTLOOK: 'outlook'
};

// Message names shared between content scripts and the background service worker.
export const RUNTIME_MESSAGES = {
  EXTRACT_EMAIL: 'extract-email',
  SCAN_EMAIL: 'scan-email'
};

export const DEFAULT_API_CONFIG = {
  endpoint: '',
  enabled: false
};
