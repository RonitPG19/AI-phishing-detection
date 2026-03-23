import { extractOutlookEmailDetails, hasActiveOutlookEmail } from './extractors/outlook-extractor.js';
import { normalizeEmailPayload } from './extractors/normalizer.js';
import { createFloatingWidget, removeFloatingWidget, WIDGET_HOST_ID } from './widget.js';
import { PROVIDERS, RUNTIME_MESSAGES } from '../shared/constants.js';
import { getWidgetPreferences } from '../shared/storage.js';

function buildNormalizedOutlookPayload() {
  // Outlook-specific selectors live in the extractor; keep this file focused on orchestration.
  const extracted = extractOutlookEmailDetails();

  if (!extracted) {
    return null;
  }

  return normalizeEmailPayload(PROVIDERS.OUTLOOK, extracted);
}

async function performOutlookScan() {
  // Outlook selectors are provider-specific; fail closed if no message is open.
  if (!hasActiveOutlookEmail()) {
    throw new Error('Open an Outlook message first, then run Analyze Email.');
  }

  const payload = buildNormalizedOutlookPayload();
  if (!payload) {
    throw new Error('Could not read the currently opened Outlook message.');
  }

  // Network calls are delegated to the background script so page code stays provider-focused.
  return chrome.runtime.sendMessage({
    type: RUNTIME_MESSAGES.SCAN_EMAIL,
    payload
  });
}

async function mountWidgetIfEnabled() {
  const preferences = await getWidgetPreferences();

  if (!preferences.enabled) {
    removeFloatingWidget();
    return;
  }

  await createFloatingWidget({
    provider: PROVIDERS.OUTLOOK,
    onScan: performOutlookScan
  });
}

function scheduleWidgetRecovery() {
  let queued = false;

  const requestMount = () => {
    if (queued) {
      return;
    }

    queued = true;
    window.setTimeout(async () => {
      queued = false;

      if (!document.getElementById(WIDGET_HOST_ID)) {
        await mountWidgetIfEnabled();
      }
    }, 200);
  };

  // Outlook frequently re-renders the reading pane shell; re-mount if the host node gets replaced.
  const observer = new MutationObserver(() => {
    if (!document.getElementById(WIDGET_HOST_ID)) {
      requestMount();
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('focus', requestMount);
  window.addEventListener('popstate', requestMount);
  window.setInterval(requestMount, 1500);
}

console.debug('[Tribunal] Outlook content script loaded');

mountWidgetIfEnabled();
scheduleWidgetRecovery();

// Allow the popup to trigger a real DOM-backed scan in the active Outlook tab.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== RUNTIME_MESSAGES.REQUEST_ACTIVE_SCAN) {
    return false;
  }

  performOutlookScan()
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({ ok: false, error: error.message || 'Unable to scan the current Outlook message.' }));

  return true;
});

// Keep the in-page widget in sync with popup settings changes.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.tribunal_widget_preferences) {
    return;
  }

  mountWidgetIfEnabled();
});
