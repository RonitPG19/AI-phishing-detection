import { buildMockScanResult } from '../shared/mock-scan-result.js';
import { getApiConfig } from '../shared/storage.js';

export async function scanEmailWithApi(payload) {
  const config = await getApiConfig();

  // Mock mode keeps the extraction pipeline testable before the real API contract is wired.
  if (!config.enabled || !config.endpoint) {
    return buildMockScanResult(payload);
  }

  // The background script owns the network boundary so auth/retry logic can stay centralized.
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}
