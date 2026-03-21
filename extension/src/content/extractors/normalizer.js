import { getCurrentTimestamp } from '../../shared/utils.js';

export function normalizeEmailPayload(provider, extracted) {
  // Keep provider-specific scraping separate from the payload shape shared with the backend.
  return {
    provider,
    subject: extracted.subject || '',
    from: extracted.from || '',
    to: extracted.to || [],
    cc: extracted.cc || [],
    bodyHtml: extracted.bodyHtml || '',
    bodyText: extracted.bodyText || '',
    links: extracted.links || [],
    attachments: extracted.attachments || [],
    headers: extracted.headers || {},
    metadata: {
      extractedAt: getCurrentTimestamp(),
      ...(extracted.metadata || {})
    }
  };
}
