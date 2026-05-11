import { getCurrentTimestamp } from '../../shared/utils.js';

function toTrimmedString(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function extractEmailAddress(value = '') {
  const input = toTrimmedString(value);
  if (!input) {
    return '';
  }

  const match = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : '';
}

function flattenHeaderValues(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenHeaderValues(item));
  }

  const normalized = toTrimmedString(value);
  return normalized ? [normalized] : [];
}

function getHeaderCandidates(headers = {}) {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    return [];
  }

  const preferredNames = ['from', 'reply-to', 'return-path', 'sender', 'x-original-from'];
  const values = [];

  preferredNames.forEach((name) => {
    Object.entries(headers).forEach(([headerName, headerValue]) => {
      if (String(headerName || '').trim().toLowerCase() === name) {
        values.push(...flattenHeaderValues(headerValue));
      }
    });
  });

  return values;
}

function normalizeSenderAddress(extracted = {}) {
  const directCandidates = [
    extracted.from,
    extracted.sender,
    extracted.senderEmail,
    ...(Array.isArray(extracted.fromCandidates) ? extracted.fromCandidates : [])
  ];

  const headerCandidates = getHeaderCandidates(extracted.headers);
  const email = [...directCandidates, ...headerCandidates]
    .map((candidate) => extractEmailAddress(candidate))
    .find(Boolean);

  return {
    raw: toTrimmedString(extracted.from || extracted.sender || ''),
    email
  };
}

export function normalizeEmailPayload(provider, extracted) {
  const sender = normalizeSenderAddress(extracted);

  // Keep provider-specific scraping separate from the payload shape shared with the backend.
  return {
    provider,
    subject: extracted.subject || '',
    from: sender.email || '',
    to: extracted.to || [],
    cc: extracted.cc || [],
    bodyHtml: extracted.bodyHtml || '',
    bodyText: extracted.bodyText || '',
    links: extracted.links || [],
    attachments: extracted.attachments || [],
    headers: extracted.headers || {},
    metadata: {
      extractedAt: getCurrentTimestamp(),
      senderRaw: sender.raw,
      senderNormalized: sender.email,
      ...(extracted.metadata || {})
    }
  };
}
