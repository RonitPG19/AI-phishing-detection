import { getApiConfig } from '../shared/storage.js';
import { buildMockScanResult } from '../shared/mock-scan-result.js';

function normalizeHeaders(headers = {}) {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(headers)
      .map(([name, value]) => {
        if (Array.isArray(value)) {
          return [name, value.filter((item) => typeof item === 'string' && item.trim())];
        }

        if (typeof value === 'string' && value.trim()) {
          return [name, [value.trim()]];
        }

        return [name, []];
      })
      .filter(([, value]) => value.length > 0)
  );
}

function buildApiPayload(payload = {}) {
  return {
    subject: payload.subject || '',
    from: payload.from || '',
    bodyHtml: payload.bodyHtml || '',
    bodyText: payload.bodyText || '',
    headers: normalizeHeaders(payload.headers)
  };
}

export async function scanEmailWithApi(payload) {
  const config = await getApiConfig();

  if (!config.enabled || !config.endpoint) {
    return buildMockScanResult(payload);
  }

  const apiPayload = buildApiPayload(payload);

  // The background script owns the network boundary so auth/retry logic can stay centralized.
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(apiPayload)
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}
