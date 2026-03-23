import { getLastScanDebug, saveWidgetPreferences } from '../shared/storage.js';
import { RUNTIME_MESSAGES } from '../shared/constants.js';

const ICONS = {
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  'scan-search': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="m16 16-1.9-1.9"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="4" x2="14" y2="4"/><line x1="10" y1="4" x2="3" y2="4"/><line x1="21" y1="12" x2="12" y2="12"/><line x1="8" y1="12" x2="3" y2="12"/><line x1="21" y1="20" x2="16" y2="20"/><line x1="12" y1="20" x2="3" y2="20"/><line x1="14" y1="2" x2="14" y2="6"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="16" y1="18" x2="16" y2="22"/></svg>`,
  'file-text': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
  'chevron-right': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  'arrow-left': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  'rotate-ccw': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
  'trash-2': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  'circle-check': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
  'check-circle-2': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
  power: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`,
  palette: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.647-.494 2.158-1.006.511-.512 1.158-1.406 2.058-2.31 1.62-.05 3.018-.28 4.194-1.282.871-.741 1.59-1.895 1.59-3.402C22 7.5 17.5 2 12 2z"/></svg>`,
  'layout-list': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><path d="M14 4h7"/><path d="M14 9h7"/><path d="M14 15h7"/><path d="M14 20h7"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  tag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  paperclip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`
};

const SETTINGS_KEY = 'tribunal_settings';
const HISTORY_KEY = 'tribunal_history';
const MAX_HISTORY_ENTRIES = 50;
const SUPPORTED_MAIL_HOSTS = ['mail.google.com', 'outlook.live.com', 'outlook.office.com', 'outlook.office365.com'];
const DEFAULT_SETTINGS = {
  enabled: true,
  floatingPopupEnabled: true,
  theme: 'light',
  scanPortions: { header: true, subject: true, body: true, footer: true, links: true, attachments: true }
};

let currentPage = 'scan';
let scanResults = null;
let scanError = '';
let isScanning = false;
let historyDetailIndex = null;
let toastTimeout = null;

function injectIcons(container = document) {
  container.querySelectorAll('[data-icon]').forEach((element) => {
    const name = element.getAttribute('data-icon');
    if (ICONS[name]) {
      element.innerHTML = ICONS[name];
    }
  });
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function prettyJson(value) {
  return value == null ? 'null' : JSON.stringify(value, null, 2);
}

function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      scanPortions: { ...DEFAULT_SETTINGS.scanPortions, ...(parsed.scanPortions || {}) }
    };
  } catch {
    return { ...DEFAULT_SETTINGS, scanPortions: { ...DEFAULT_SETTINGS.scanPortions } };
  }
}

function saveSettings(nextSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
  showSaveToast();
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ENTRIES)));
}

function addToHistory(result) {
  const history = getHistory();
  history.unshift(result);
  saveHistory(history);
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

function showSaveToast() {
  const toast = document.getElementById('save-toast');
  if (!toast) return;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 1400);
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
}

function formatTimestamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function truncate(value = '', maxLength = 48) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function getIssueCount(result) {
  return Object.values(result.sections || {}).reduce((count, section) => count + (section?.issues?.length || 0), 0);
}
function renderIssueCard(issue, sectionKey, index) {
  const issueId = `${sectionKey}-${index}`;
  const detailRows = String(issue.details || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(': ');
      const value = rest.join(': ');
      if (!value) {
        return `<div class="issue-detail-row"><span class="issue-detail-value">${escapeHtml(label)}</span></div>`;
      }
      return `<div class="issue-detail-row"><span class="issue-detail-label">${escapeHtml(label)}</span><span class="issue-detail-value">${escapeHtml(value)}</span></div>`;
    })
    .join('');

  return `
    <div class="issue-card">
      <button class="issue-card-header" data-issue="${issueId}" aria-expanded="false">
        <span class="issue-card-title">${escapeHtml(issue.title || 'Flagged issue')}</span>
        <span class="badge badge-${escapeHtml(issue.severity || 'low')}">${escapeHtml(issue.severity || 'low')}</span>
      </button>
      <div class="issue-card-detail" id="issue-detail-${issueId}">
        <div class="issue-card-detail-inner">
          <div class="issue-detail-row"><span class="issue-detail-label">Found in</span><span class="issue-detail-value">${escapeHtml(sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1))}</span></div>
          ${detailRows}
          ${issue.explanation ? `<div class="issue-explanation">${escapeHtml(issue.explanation)}</div>` : ''}
        </div>
      </div>
    </div>`;
}

function renderSection(key, section) {
  const count = section?.issues?.length || 0;
  const hasIssues = count > 0;
  const iconMap = { header: 'mail', subject: 'tag', body: 'file-text', links: 'link', attachments: 'paperclip' };

  return `
    <div class="section-item">
      <button class="section-header" data-section="${key}" aria-expanded="false" aria-controls="section-body-${key}">
        <i data-icon="chevron-right" class="section-arrow"></i>
        <i data-icon="${iconMap[key] || 'shield'}" class="section-type-icon"></i>
        <span class="section-title">${escapeHtml(section.label || key)}</span>
        <span class="section-count ${hasIssues ? 'has-issues' : ''}">${count}</span>
      </button>
      <div class="section-body" id="section-body-${key}">
        ${hasIssues ? `<div class="issue-list">${section.issues.map((issue, index) => renderIssueCard(issue, key, index)).join('')}</div>` : `<div class="no-issues"><i data-icon="circle-check"></i> No issues detected</div>`}
      </div>
    </div>`;
}

function renderResultView(result) {
  const issueCount = getIssueCount(result);
  return `
    <div class="results-summary">
      <div class="results-threat-label">${escapeHtml(String(result.overallThreat || 'safe').toUpperCase())} RISK</div>
      <div class="results-issue-count">${issueCount} issue${issueCount === 1 ? '' : 's'} found</div>
    </div>
    <div class="section-group">${Object.entries(result.sections || {}).map(([key, section]) => renderSection(key, section)).join('')}</div>
    <div class="results-actions">
      <button class="btn-secondary" id="copy-report-btn"><i data-icon="clipboard"></i> Copy Report</button>
      <button class="btn-secondary" id="scan-again-btn"><i data-icon="rotate-ccw"></i> Scan Again</button>
    </div>`;
}

function renderScanPage() {
  const container = document.getElementById('page-container');
  const settings = getSettings();

  if (isScanning) {
    container.innerHTML = `<div class="scan-loading page-enter"><div class="spinner" aria-label="Scanning"></div><p class="scan-loading-text">Analyzing current email...</p></div>`;
    return;
  }

  if (scanResults) {
    container.innerHTML = `<div class="page-enter">${renderResultView(scanResults)}</div>`;
    injectIcons(container);
    return;
  }

  if (scanError) {
    container.innerHTML = `<div class="error-state page-enter"><i data-icon="shield" class="empty-state-icon"></i><p class="error-state-msg">${escapeHtml(scanError)}</p><button class="btn-primary" id="scan-btn" ${!settings.enabled ? 'disabled' : ''}><i data-icon="scan-search"></i> Try Again</button></div>`;
    injectIcons(container);
    return;
  }

  container.innerHTML = `<div class="scan-hero page-enter"><i data-icon="shield" class="scan-hero-icon"></i><p class="scan-empty-text">Open Gmail or Outlook in the active tab, then click Scan Now to analyze the current email.</p><div class="scan-btn-wrap"><button class="btn-primary" id="scan-btn" ${!settings.enabled ? 'disabled' : ''}><i data-icon="scan-search"></i> Scan Now</button>${!settings.enabled ? '<p class="scan-disabled-hint">Enable extension in Settings</p>' : ''}</div></div>`;
  injectIcons(container);
}

function renderHistoryPage() {
  const container = document.getElementById('page-container');
  const history = getHistory();

  if (historyDetailIndex !== null && history[historyDetailIndex]) {
    const result = history[historyDetailIndex];
    const issueCount = getIssueCount(result);
    container.innerHTML = `<div class="page-enter"><button class="back-btn" id="history-back-btn"><i data-icon="arrow-left"></i> Back to History</button><div class="results-summary"><div class="results-threat-label">${escapeHtml(String(result.overallThreat || 'safe').toUpperCase())} RISK</div><div class="results-issue-count">${issueCount} issue${issueCount === 1 ? '' : 's'} found</div><p style="margin-top:4px;font-size:12px;color:var(--text-muted)">${escapeHtml(formatTimestamp(result.timestamp))} - ${escapeHtml(truncate(result.emailSubject || 'Current message', 52))}</p></div><div class="section-group">${Object.entries(result.sections || {}).map(([key, section]) => renderSection(key, section)).join('')}</div></div>`;
    injectIcons(container);
    return;
  }

  if (!history.length) {
    container.innerHTML = `<div class="empty-state page-enter"><i data-icon="clock" class="empty-state-icon"></i><p class="empty-state-text">No completed scans yet. Run a real scan from the Scan tab to populate history.</p></div>`;
    injectIcons(container);
    return;
  }

  container.innerHTML = `<div class="page-enter"><div class="history-list">${history.map((entry, index) => `<div class="history-entry" data-history-index="${index}" role="button" tabindex="0" aria-label="View scan from ${escapeHtml(formatTimestamp(entry.timestamp))}"><div class="history-entry-info"><div class="history-entry-subject">${escapeHtml(truncate(entry.emailSubject || 'Current message'))}</div><div class="history-entry-time">${escapeHtml(formatTimestamp(entry.timestamp))}</div></div><span class="badge badge-${escapeHtml(entry.overallThreat || 'safe')}">${escapeHtml(entry.overallThreat || 'safe')}</span><i data-icon="chevron-right" class="history-entry-arrow"></i></div>`).join('')}</div><div class="history-clear-wrap"><button class="btn-danger" id="clear-history-btn"><i data-icon="trash-2"></i> Clear History</button></div></div>`;
  injectIcons(container);
}

function renderSettingsPage() {
  const container = document.getElementById('page-container');
  const settings = getSettings();

  container.innerHTML = `<div class="page-enter"><div class="settings-section"><div class="settings-section-title"><i data-icon="power"></i> Extension Status</div><div class="settings-row"><span class="settings-label">Enabled</span><label class="toggle"><input type="checkbox" id="setting-enabled" ${settings.enabled ? 'checked' : ''}><span class="toggle-track"></span><span class="toggle-thumb"></span></label></div><div class="settings-row"><div class="settings-label-group"><span class="settings-label">Floating popup</span><span class="settings-caption">Show the in-page Tribunal widget on Gmail and Outlook.</span></div><label class="toggle"><input type="checkbox" id="setting-floating-popup" ${settings.floatingPopupEnabled ? 'checked' : ''}><span class="toggle-track"></span><span class="toggle-thumb"></span></label></div></div><div class="settings-section"><div class="settings-section-title"><i data-icon="palette"></i> Theme</div><div class="radio-group"><label class="radio-option"><input type="radio" name="theme" value="light" ${settings.theme === 'light' ? 'checked' : ''}>Light</label><label class="radio-option"><input type="radio" name="theme" value="dark" ${settings.theme === 'dark' ? 'checked' : ''}>Dark</label></div></div><div class="settings-section"><div class="settings-section-title"><i data-icon="layout-list"></i> Scan Portions</div><div class="checkbox-list">${Object.entries(settings.scanPortions).map(([key, enabled]) => `<div class="checkbox-row"><label><input type="checkbox" data-portion="${key}" ${enabled ? 'checked' : ''}>${escapeHtml(key.charAt(0).toUpperCase() + key.slice(1))}</label></div>`).join('')}</div></div><hr class="settings-divider"><p class="settings-footer">Changes saved automatically</p></div><div class="save-toast" id="save-toast"><i data-icon="check-circle-2"></i> Saved</div>`;
  injectIcons(container);
}

async function renderDebugPage() {
  const container = document.getElementById('page-container');
  container.innerHTML = `<div class="page-enter"><div class="settings-section"><div class="settings-section-title"><i data-icon="file-text"></i> Debug Payload</div><p class="debug-intro">Inspect the exact normalized JSON produced by the most recent scan.</p></div><div class="scan-loading"><div class="spinner" aria-label="Loading debug data"></div><p class="scan-loading-text">Loading debug snapshot...</p></div></div>`;
  injectIcons(container);

  const debug = await getLastScanDebug();
  container.innerHTML = `<div class="page-enter"><div class="settings-section"><div class="settings-section-title"><i data-icon="file-text"></i> Debug Payload</div><p class="debug-intro">Inspect the exact normalized JSON produced by the most recent scan.</p><p class="debug-meta">Last updated: ${escapeHtml(debug.updatedAt ? formatTimestamp(debug.updatedAt) : 'No scan yet')}</p></div><div class="debug-actions"><button class="btn-secondary" id="refresh-debug-btn"><i data-icon="rotate-ccw"></i> Refresh</button><button class="btn-secondary" id="copy-debug-payload-btn"><i data-icon="clipboard"></i> Copy Payload</button><button class="btn-secondary" id="copy-debug-result-btn"><i data-icon="clipboard"></i> Copy Result</button></div><div class="debug-card"><div class="debug-card-title">Payload JSON</div><pre class="debug-pre">${escapeHtml(prettyJson(debug.payload))}</pre></div><div class="debug-card"><div class="debug-card-title">Result JSON</div><pre class="debug-pre">${escapeHtml(prettyJson(debug.result))}</pre></div></div>`;
  injectIcons(container);
}
function navigateTo(page) {
  currentPage = page;
  historyDetailIndex = null;

  document.querySelectorAll('.tab-item').forEach((tab) => {
    const active = tab.dataset.page === page;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  renderCurrentPage();
}

function renderCurrentPage() {
  if (currentPage === 'history') {
    renderHistoryPage();
    return;
  }

  if (currentPage === 'debug') {
    renderDebugPage();
    return;
  }

  if (currentPage === 'settings') {
    renderSettingsPage();
    return;
  }

  renderScanPage();
}

async function requestActiveScan() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error('No active tab available. Open Gmail or Outlook and try again.');
  }

  const tabUrl = tab.url || '';
  const supported = SUPPORTED_MAIL_HOSTS.some((host) => tabUrl.startsWith(`https://${host}/`));
  if (!supported) {
    throw new Error('Open Gmail or Outlook in the active tab, then run the scan again.');
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { type: RUNTIME_MESSAGES.REQUEST_ACTIVE_SCAN }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error('Could not reach the mail page. Refresh the tab and try again.'));
        return;
      }

      if (!response) {
        reject(new Error('No scan response was returned from the active tab.'));
        return;
      }

      if (response.ok === false) {
        reject(new Error(response.error || 'The current message could not be scanned.'));
        return;
      }

      resolve(response.result || response);
    });
  });
}

async function startScan() {
  isScanning = true;
  scanResults = null;
  scanError = '';
  renderScanPage();

  try {
    const result = await requestActiveScan();
    scanResults = result;
    addToHistory(result);
  } catch (error) {
    scanError = error.message || 'Unable to scan the current message.';
  } finally {
    isScanning = false;
    renderScanPage();
  }
}

async function copyReport() {
  if (!scanResults) {
    return;
  }

  let report = '';
  report += 'TRIBUNAL SCAN REPORT\n';
  report += `Threat Level: ${String(scanResults.overallThreat || 'safe').toUpperCase()}\n`;
  report += `Issues Found: ${getIssueCount(scanResults)}\n`;
  report += `Scanned: ${formatTimestamp(scanResults.timestamp)}\n`;
  report += `Subject: ${scanResults.emailSubject || 'Current message'}\n\n`;

  Object.entries(scanResults.sections || {}).forEach(([key, section]) => {
    report += `${section.label || key} (${section.issues.length})\n`;
    if (!section.issues.length) {
      report += '  - No issues detected\n';
    } else {
      section.issues.forEach((issue) => {
        report += `  - ${issue.title} [${issue.severity}]\n`;
        if (issue.details) {
          report += `    ${issue.details.replace(/\n/g, ' | ')}\n`;
        }
        if (issue.explanation) {
          report += `    ${issue.explanation}\n`;
        }
      });
    }
    report += '\n';
  });

  await navigator.clipboard.writeText(report);
  const button = document.getElementById('copy-report-btn');
  if (button) {
    button.innerHTML = '<i data-icon="circle-check"></i> Copied!';
    injectIcons(button);
    window.setTimeout(() => {
      button.innerHTML = '<i data-icon="clipboard"></i> Copy Report';
      injectIcons(button);
    }, 1400);
  }
}
document.addEventListener('click', (event) => {
  const navTarget = event.target.closest('[data-page]');
  if (navTarget && navTarget.closest('.tab-bar')) {
    navigateTo(navTarget.dataset.page);
    return;
  }

  if (event.target.closest('#scan-btn')) {
    startScan();
    return;
  }

  if (event.target.closest('#scan-again-btn')) {
    scanResults = null;
    scanError = '';
    renderScanPage();
    return;
  }

  if (event.target.closest('#copy-report-btn')) {
    copyReport();
    return;
  }

  if (event.target.closest('#refresh-debug-btn')) {
    renderDebugPage();
    return;
  }

  if (event.target.closest('#copy-debug-payload-btn')) {
    getLastScanDebug().then((debug) => navigator.clipboard.writeText(prettyJson(debug.payload)));
    return;
  }

  if (event.target.closest('#copy-debug-result-btn')) {
    getLastScanDebug().then((debug) => navigator.clipboard.writeText(prettyJson(debug.result)));
    return;
  }

  const sectionHeader = event.target.closest('.section-header');
  if (sectionHeader) {
    const body = document.getElementById(`section-body-${sectionHeader.dataset.section}`);
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open');
    sectionHeader.setAttribute('aria-expanded', String(!isOpen));
    return;
  }

  const issueHeader = event.target.closest('.issue-card-header');
  if (issueHeader) {
    const detail = document.getElementById(`issue-detail-${issueHeader.dataset.issue}`);
    const isOpen = detail.classList.contains('open');
    detail.classList.toggle('open');
    issueHeader.setAttribute('aria-expanded', String(!isOpen));
    return;
  }

  const historyEntry = event.target.closest('.history-entry');
  if (historyEntry) {
    historyDetailIndex = Number(historyEntry.dataset.historyIndex);
    renderHistoryPage();
    return;
  }

  if (event.target.closest('#history-back-btn')) {
    historyDetailIndex = null;
    renderHistoryPage();
    return;
  }

  if (event.target.closest('#clear-history-btn')) {
    clearHistory();
    historyDetailIndex = null;
    renderHistoryPage();
  }
});

document.addEventListener('change', (event) => {
  if (currentPage !== 'settings') {
    return;
  }

  const settings = getSettings();

  if (event.target.id === 'setting-enabled') {
    settings.enabled = event.target.checked;
    saveSettings(settings);
    return;
  }

  if (event.target.id === 'setting-floating-popup') {
    settings.floatingPopupEnabled = event.target.checked;
    saveSettings(settings);
    saveWidgetPreferences({ enabled: settings.floatingPopupEnabled });
    return;
  }

  if (event.target.name === 'theme') {
    settings.theme = event.target.value;
    applyTheme(settings.theme);
    saveSettings(settings);
    return;
  }

  if (event.target.dataset.portion) {
    settings.scanPortions[event.target.dataset.portion] = event.target.checked;
    saveSettings(settings);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const historyEntry = event.target.closest('.history-entry');
    if (historyEntry) {
      historyEntry.click();
    }
  }
});

function init() {
  const settings = getSettings();
  applyTheme(settings.theme);
  saveWidgetPreferences({ enabled: settings.floatingPopupEnabled });
  navigateTo('scan');
  injectIcons(document);
}

init();
