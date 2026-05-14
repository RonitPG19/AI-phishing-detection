import { SPRING_API_BASE_URL } from './constants.js';
import { getAuthSession, saveAuthSession } from './storage.js';

const PROVIDER_LABELS = {
  google: 'Gmail',
  outlook: 'Outlook'
};

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export function getOAuthRedirectUrl() {
  return chrome.runtime.getURL('oauth2-redirect.html');
}

export function getProviderLabel(provider) {
  return PROVIDER_LABELS[provider] || provider;
}

export function startMailboxOAuth(provider) {
  const url = `${SPRING_API_BASE_URL}/oauth2/authorization/${encodeURIComponent(provider)}`;
  chrome.tabs.create({ url });
}

function decodeJwtClaims(token = '') {
  try {
    const payload = String(token).split('.')[1] || '';
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
    return JSON.parse(decodeURIComponent(escape(atob(padded))));
  } catch {
    return {};
  }
}

export async function completeOAuthSessionFromRedirect(token, tokenType = 'Bearer') {
  if (!token) {
    throw new Error('OAuth redirect did not include an access token.');
  }

  const claims = decodeJwtClaims(token);
  const session = {
    accessToken: token,
    refreshToken: '',
    tokenType,
    user: {
      provider: claims.provider || 'oauth',
      email: claims.email || '',
      uid: claims.sub || '',
      name: claims.name || '',
      picture: claims.picture || ''
    },
    loggedInAt: new Date().toISOString()
  };

  await saveAuthSession(session);
  return session;
}

async function requestSpringApi(path, options = {}) {
  const session = await getAuthSession();
  const token = session?.accessToken || '';

  if (!token) {
    throw new Error('Connect or log in before calling mailbox APIs.');
  }

  const response = await fetch(`${SPRING_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const message = data?.error || data?.message || `Mailbox request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export async function fetchMailboxConnections() {
  const connections = await requestSpringApi('/api/mail/connections');
  return Array.isArray(connections) ? connections : [];
}

export async function listMailboxMessages(provider, limit = 10, query = '') {
  const params = new URLSearchParams({
    provider,
    limit: String(limit)
  });
  if (query) {
    params.set('query', query);
  }

  const messages = await requestSpringApi(`/api/mail/messages?${params.toString()}`);
  return Array.isArray(messages) ? messages : [];
}

export async function getMailboxMessage(provider, messageId) {
  const params = new URLSearchParams({ provider });
  return requestSpringApi(`/api/mail/messages/${encodeURIComponent(messageId)}?${params.toString()}`);
}

export function mailboxMessageToScanPayload(mail = {}, provider = '') {
  const normalizedProvider = String(provider || '').trim().toLowerCase() === 'gmail' ? 'google' : String(provider || '').trim().toLowerCase();

  return {
    provider: normalizedProvider || 'google',
    subject: mail.subject || '',
    from: mail.from || '',
    to: mail.to ? [mail.to] : [],
    cc: [],
    bodyHtml: mail.bodyHtml || '',
    bodyText: mail.bodyText || mail.snippet || '',
    links: [],
    attachments: Array.isArray(mail.attachments) ? mail.attachments : [],
    headers: {
      From: mail.from ? [mail.from] : [],
      To: mail.to ? [mail.to] : [],
      Date: mail.date ? [mail.date] : []
    },
    metadata: {
      source: 'provider-api',
      provider: normalizedProvider || 'google',
      messageId: mail.id || '',
      threadId: mail.threadId || '',
      hasAttachments: Array.isArray(mail.attachments) && mail.attachments.length > 0,
      attachmentCount: Array.isArray(mail.attachments) ? mail.attachments.length : 0,
      extractedAt: new Date().toISOString()
    }
  };
}
