import { extractGmailEmailDetails, hasActiveGmailEmail } from './extractors/gmail-extractor.js';
import { normalizeEmailPayload } from './extractors/normalizer.js';
import { createFloatingWidget, removeFloatingWidget, WIDGET_HOST_ID } from './widget.js';
import { PROVIDERS, RUNTIME_MESSAGES } from '../shared/constants.js';
import { getAuthSession, getWidgetPreferences } from '../shared/storage.js';

function buildNormalizedGmailPayload() {
  // Gmail-specific selectors live in the extractor; keep this file focused on orchestration.
  const extracted = extractGmailEmailDetails();

  if (!extracted) {
    return null;
  }

  return normalizeEmailPayload(PROVIDERS.GMAIL, extracted);
}

async function performGmailScan() {
  const session = await getAuthSession();
  if (!session?.accessToken) {
    throw new Error('Log in to analyze emails with Tribunal.');
  }

  // Only scan when Gmail is showing a concrete message view.
  if (!hasActiveGmailEmail()) {
    throw new Error('Open a Gmail message first, then run Analyze Email.');
  }

  const payload = buildNormalizedGmailPayload();
  if (!payload) {
    throw new Error('Could not read the currently opened Gmail message.');
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
    provider: PROVIDERS.GMAIL,
    onScan: performGmailScan
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
    }, 150);
  };

  // Gmail is an SPA; when it swaps large DOM regions we re-check that the floating host still exists.
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

console.debug('[Tribunal] Gmail content script loaded');

mountWidgetIfEnabled();
scheduleWidgetRecovery();

// Allow the popup to trigger a real DOM-backed scan in the active Gmail tab.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== RUNTIME_MESSAGES.REQUEST_ACTIVE_SCAN) {
    return false;
  }

  performGmailScan()
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({ ok: false, error: error.message || 'Unable to scan the current Gmail message.' }));

  return true;
});

// Keep the in-page widget in sync with popup settings changes.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.tribunal_widget_preferences) {
    return;
  }

  mountWidgetIfEnabled();
});
