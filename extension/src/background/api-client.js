import { getApiConfig, getAuthSession } from '../shared/storage.js';
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

function extractEmailAddress(value = '') {
  const input = String(value || '').trim();
  if (!input) {
    return '';
  }

  // Accept both plain addresses and display-name formats like "Name <user@domain.com>".
  const match = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : '';
}

function normalizeLinks(links = []) {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .map((item) => ({
      href: String(item?.href || '').trim(),
      text: String(item?.text || '').trim()
    }))
    .filter((item) => item.href);
}

function buildApiPayload(payload = {}) {
  const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
  const providerRaw = String(metadata.provider || payload.provider || '').trim().toLowerCase();
  const provider = providerRaw === 'gmail' ? 'google' : providerRaw;
  const resolvedMessageId = String(metadata.messageId || payload.messageId || metadata.threadId || '').trim();
  const scanPortions = metadata.scanPortions && typeof metadata.scanPortions === 'object'
    ? metadata.scanPortions
    : {};
  const includeAttachments = scanPortions.attachments !== false;

  return {
    subject: payload.subject || '',
    from: extractEmailAddress(payload.from),
    bodyHtml: payload.bodyHtml || '',
    bodyText: payload.bodyText || '',
    headers: normalizeHeaders(payload.headers),
    links: normalizeLinks(payload.links),
    provider: provider || 'google',
    messageId: includeAttachments ? resolvedMessageId : '',
    query: String(payload.query || '').trim()
  };
}

function normalizeSeverity(value = '') {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high' || normalized === 'critical') return 'high';
  if (normalized === 'medium') return 'medium';
  if (normalized === 'low') return 'low';
  return 'low';
}

function riskLabelFromScore(score = 0) {
  const numeric = Number(score) || 0;
  if (numeric >= 75) return 'critical';
  if (numeric >= 55) return 'high';
  if (numeric >= 30) return 'medium';
  if (numeric >= 10) return 'low';
  return 'safe';
}

function toIssue(finding = {}) {
  const description = String(finding.description || '').trim();
  const target = String(finding.target || '').trim();
  const severity = normalizeSeverity(finding.severity);

  return {
    severity,
    title: description || 'Flagged finding',
    details: target ? `Target: ${target}` : '',
    explanation: ''
  };
}

function normalizeAttachmentSeverity(verdict = '') {
  const normalized = String(verdict || '').toLowerCase();
  if (normalized.includes('malicious') || normalized.includes('danger')) return 'high';
  if (normalized.includes('suspicious') || normalized.includes('warning')) return 'medium';
  if (normalized.includes('benign') || normalized.includes('safe')) return 'safe';
  return 'low';
}

function toAttachmentIssue(attachment = {}) {
  const filename = String(attachment.filename || 'Attachment').trim();
  const verdict = String(attachment.verdict || 'Scanned').trim();
  const reason = String(attachment.technicalReason || attachment.predictedBehavior || '').trim();
  const mimeDetails = [
    attachment.declaredMimeType ? `Declared MIME: ${attachment.declaredMimeType}` : '',
    attachment.detectedMimeType ? `Detected MIME: ${attachment.detectedMimeType}` : ''
  ].filter(Boolean).join('\n');
  const extractedUrls = Array.isArray(attachment.extractedUrls) && attachment.extractedUrls.length
    ? `Extracted URLs: ${attachment.extractedUrls.join(', ')}`
    : '';

  return {
    severity: normalizeAttachmentSeverity(verdict),
    title: `${filename}: ${verdict}`,
    details: [reason, mimeDetails, extractedUrls].filter(Boolean).join('\n'),
    explanation: String(attachment.predictedBehavior || '').trim()
  };
}

function normalizeApiSections(apiSections = {}, headerInspectionResult = {}, flatFindings = [], attachments = []) {
  const sourceSections = apiSections && typeof apiSections === 'object' ? apiSections : {};

  const mapped = {
    header: {
      label: 'Header',
      issues: (sourceSections.Header?.findings || []).map(toIssue)
    },
    subject: {
      label: 'Subject',
      issues: (sourceSections.Subject?.findings || []).map(toIssue)
    },
    body: {
      label: 'Body',
      issues: (sourceSections.Body?.findings || []).map(toIssue)
    },
    links: {
      label: 'Links',
      issues: (sourceSections.Links?.findings || []).map(toIssue)
    },
    attachments: {
      label: 'Attachments',
      issues: Array.isArray(attachments) ? attachments.map(toAttachmentIssue) : []
    }
  };

  // Fallback: if sectioning is missing, convert known header auth flags into header issues.
  if (!mapped.header.issues.length && headerInspectionResult && typeof headerInspectionResult === 'object') {
    const authChecks = [
      ['spfFail', 'SPF check failed'],
      ['dkimFail', 'DKIM check failed'],
      ['dmarcFail', 'DMARC check failed'],
      ['displayNameMismatch', 'Display name mismatch detected'],
      ['replyToMismatch', 'Reply-To mismatch detected'],
      ['returnPathMismatch', 'Return-Path mismatch detected']
    ];

    authChecks.forEach(([key, title]) => {
      if (headerInspectionResult[key]) {
        mapped.header.issues.push({
          severity: key.includes('Mismatch') ? 'low' : 'medium',
          title,
          details: '',
          explanation: ''
        });
      }
    });
  }

  // Backward compatibility: older API responses may return a flat findings array.
  if (!Object.values(mapped).some((section) => section.issues.length) && Array.isArray(flatFindings) && flatFindings.length) {
    flatFindings.forEach((finding) => {
      const normalized = String(finding?.description || '').toLowerCase();
      if (normalized.includes('spf') || normalized.includes('dkim') || normalized.includes('dmarc') || normalized.includes('reply-to') || normalized.includes('display name') || normalized.includes('return-path')) {
        mapped.header.issues.push(toIssue(finding));
        return;
      }
      if (normalized.includes('subject')) {
        mapped.subject.issues.push(toIssue(finding));
        return;
      }
      if (normalized.includes('redirect') || normalized.includes('url') || normalized.includes('link') || normalized.includes('domain') || normalized.includes('ssl') || normalized.includes('certificate')) {
        mapped.links.issues.push(toIssue(finding));
        return;
      }
      mapped.body.issues.push(toIssue(finding));
    });
  }

  return mapped;
}

function mapApiResultToExtensionShape(apiResult = {}, originalPayload = {}) {
  const overallRiskScore = Number(apiResult.overallRiskScore) || 0;
  const aiSummary = String(apiResult?.aiAnalysis?.summary || '').trim();
  const metadata = originalPayload.metadata && typeof originalPayload.metadata === 'object'
    ? originalPayload.metadata
    : {};
  const extractionSource = metadata.source || (metadata.messageId || originalPayload.messageId ? 'provider-api' : 'dom');
  const extractionProvider = metadata.provider || originalPayload.provider || '';
  const sections = normalizeApiSections(apiResult.sections, apiResult.headerInspectionResult, apiResult.findings, apiResult.attachments);
  const issueCount = Object.values(sections).reduce((count, section) => count + (section.issues?.length || 0), 0);

  return {
    source: 'api',
    extractionSource,
    extractionProvider,
    messageId: metadata.messageId || '',
    status: 'completed',
    overallThreat: riskLabelFromScore(overallRiskScore),
    overallRiskScore,
    issueCount,
    sections,
    timestamp: new Date().toISOString(),
    emailSubject: apiResult.subject || originalPayload.subject || 'Current message',
    message: aiSummary || 'Scan completed with API analysis.',
    reportId: apiResult.reportId || null,
    headerInspectionResult: apiResult.headerInspectionResult || null,
    aiAnalysis: apiResult.aiAnalysis || null
  };
}

export async function scanEmailWithApi(payload) {
  const config = await getApiConfig();

  if (!config.enabled || !config.endpoint) {
    return buildMockScanResult(payload);
  }

  const apiPayload = buildApiPayload(payload);

  if (!apiPayload.from) {
    throw new Error('Sender email could not be extracted from this message. Refresh the page and try again.');
  }

  const shouldForceRefresh = Boolean(apiPayload.messageId);
  const scanEndpoint = shouldForceRefresh
    ? `${config.endpoint}${config.endpoint.includes('?') ? '&' : '?'}forceRefresh=true`
    : config.endpoint;

  // The background script owns the network boundary so auth/retry logic can stay centralized.
  const response = await fetch(scanEndpoint, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(await getAuthorizationHeader())
    },
    body: JSON.stringify(apiPayload)
  });

  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;

    try {
      const errorPayload = await response.json();
      if (errorPayload?.fields?.from) {
        errorMessage = errorPayload.fields.from;
      } else if (errorPayload?.error) {
        errorMessage = errorPayload.error;
      }
    } catch {
      // Fall back to the status-based message when the backend does not return JSON.
    }

    throw new Error(errorMessage);
  }

  const apiResult = await response.json();
  return mapApiResultToExtensionShape(apiResult, payload);
}

async function getAuthorizationHeader() {
  const session = await getAuthSession();
  const token = session?.accessToken || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}
