import { extractGmailEmailDetails, hasActiveGmailEmail } from './extractors/gmail-extractor.js';
import { normalizeEmailPayload } from './extractors/normalizer.js';
import { createFloatingWidget, removeFloatingWidget } from './widget.js';
import { PROVIDERS, RUNTIME_MESSAGES } from '../shared/constants.js';
import { getWidgetPreferences } from '../shared/storage.js';

function buildNormalizedGmailPayload() {
  // Gmail-specific selectors live in the extractor; keep this file focused on orchestration.
  const extracted = extractGmailEmailDetails();

  if (!extracted) {
    return null;
  }

  return normalizeEmailPayload(PROVIDERS.GMAIL, extracted);
}

async function mountWidgetIfEnabled() {
  const preferences = await getWidgetPreferences();

  if (!preferences.enabled) {
    removeFloatingWidget();
    return;
  }

  await createFloatingWidget({
    provider: PROVIDERS.GMAIL,
    onScan: async () => {
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
  });
}

console.debug('[Tribunal] Gmail content script loaded');

mountWidgetIfEnabled();

// Keep the in-page widget in sync with popup settings changes.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.tribunal_widget_preferences) {
    return;
  }

  mountWidgetIfEnabled();
});
