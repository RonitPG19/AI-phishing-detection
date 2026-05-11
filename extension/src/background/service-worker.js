import { scanEmailWithApi } from './api-client.js';
import { RUNTIME_MESSAGES } from '../shared/constants.js';
import { addScanHistoryEntry, saveLastScanDebug } from '../shared/storage.js';

const GMAIL_PREFIX = 'https://mail.google.com/';
const OUTLOOK_PREFIXES = [
  'https://outlook.cloud.microsoft/',
  'https://outlook.live.com/',
  'https://outlook.office.com/',
  'https://outlook.office365.com/'
];

const INJECTION_BY_PROVIDER = {
  gmail: ['src/content/gmail.js'],
  outlook: ['src/content/outlook.js']
};

const injectionQueue = new Map();

function getProviderFromUrl(url = '') {
  const normalized = String(url || '');
  if (normalized.startsWith(GMAIL_PREFIX)) {
    return 'gmail';
  }

  if (OUTLOOK_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return 'outlook';
  }

  return '';
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      resolve({
        response,
        runtimeError: chrome.runtime.lastError?.message || ''
      });
    });
  });
}

async function hasContentReceiver(tabId) {
  const result = await sendMessageToTab(tabId, { type: RUNTIME_MESSAGES.PING_CONTENT });
  return !result.runtimeError;
}

async function ensureContentScript(tabId, tabUrl) {
  if (!tabId || !chrome.scripting?.executeScript) {
    return false;
  }

  const provider = getProviderFromUrl(tabUrl);
  if (!provider) {
    return false;
  }

  const queueKey = `${tabId}:${provider}`;
  if (injectionQueue.has(queueKey)) {
    return injectionQueue.get(queueKey);
  }

  const task = (async () => {
    if (await hasContentReceiver(tabId)) {
      return true;
    }

    const files = INJECTION_BY_PROVIDER[provider] || [];
    if (!files.length) {
      return false;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files
      });
    } catch {
      return false;
    }

    // Give Firefox a short tick to register listeners in newly injected scripts.
    await new Promise((resolve) => setTimeout(resolve, 120));
    return hasContentReceiver(tabId);
  })()
    .catch(() => false)
    .finally(() => {
      injectionQueue.delete(queueKey);
    });

  injectionQueue.set(queueKey, task);
  return task;
}

async function bootstrapOpenMailTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(
      tabs
        .filter((tab) => Number.isInteger(tab.id) && typeof tab.url === 'string')
        .map((tab) => ensureContentScript(tab.id, tab.url))
    );
  } catch {
    // Best-effort bootstrap; popup flow still performs scan-time recovery.
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === RUNTIME_MESSAGES.HEARTBEAT) {
    sendResponse({ ok: true, ts: Date.now() });
    return false;
  }

  if (message?.type !== RUNTIME_MESSAGES.SCAN_EMAIL) {
    return false;
  }

  // Persist the request/response pair so the popup can inspect the last generated payload.
  saveLastScanDebug({ payload: message.payload, result: null })
    .then(() => scanEmailWithApi(message.payload))
    .then(async (result) => {
      await saveLastScanDebug({ payload: message.payload, result });
      await addScanHistoryEntry(result);
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

chrome.runtime.onInstalled.addListener(() => {
  bootstrapOpenMailTabs();
});

chrome.runtime.onStartup.addListener(() => {
  bootstrapOpenMailTabs();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const maybeUrl = tab?.url || changeInfo?.url || '';
  if (!maybeUrl) {
    return;
  }

  if (changeInfo.status === 'complete' || changeInfo.url) {
    ensureContentScript(tabId, maybeUrl);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    ensureContentScript(tabId, tab?.url || '');
  } catch {
    // Ignore tabs that disappear before activation resolves.
  }
});
