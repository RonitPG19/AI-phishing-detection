import { extractOutlookEmailDetails, hasActiveOutlookEmail } from './extractors/outlook-extractor.js';
import { normalizeEmailPayload } from './extractors/normalizer.js';
import { createFloatingWidget, removeFloatingWidget } from './widget.js';
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

async function mountWidgetIfEnabled() {
  const preferences = await getWidgetPreferences();

  if (!preferences.enabled) {
    removeFloatingWidget();
    return;
  }

  await createFloatingWidget({
    provider: PROVIDERS.OUTLOOK,
    onScan: async () => {
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
  });
}

console.debug('[Tribunal] Outlook content script loaded');

mountWidgetIfEnabled();

// Keep the in-page widget in sync with popup settings changes.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.tribunal_widget_preferences) {
    return;
  }

  mountWidgetIfEnabled();
});
