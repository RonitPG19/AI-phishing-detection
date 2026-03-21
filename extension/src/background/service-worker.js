import { scanEmailWithApi } from './api-client.js';
import { RUNTIME_MESSAGES } from '../shared/constants.js';
import { saveLastScanDebug } from '../shared/storage.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== RUNTIME_MESSAGES.SCAN_EMAIL) {
    return false;
  }

  // Persist the request/response pair so the popup can inspect the last generated payload.
  saveLastScanDebug({ payload: message.payload, result: null })
    .then(() => scanEmailWithApi(message.payload))
    .then(async (result) => {
      await saveLastScanDebug({ payload: message.payload, result });
      sendResponse({ ok: true, result });
    })
    .catch(async (error) => {
      await saveLastScanDebug({
        payload: message.payload,
        result: {
          error: error.message,
          ok: false
        }
      });
      sendResponse({ ok: false, error: error.message });
    });

  return true;
});
