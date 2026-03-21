import { saveWidgetPreferences, getLastScanDebug } from '../shared/storage.js';

  /* ============================================
   TRIBUNAL — Core Extension Logic
   ============================================ */

// ─── Local SVG Icons (Zero Dependency) ───────
const ICONS = {
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  'scan-search': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="m16 16-1.9-1.9"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="4" x2="14" y2="4"/><line x1="10" y1="4" x2="3" y2="4"/><line x1="21" y1="12" x2="12" y2="12"/><line x1="8" y1="12" x2="3" y2="12"/><line x1="21" y1="20" x2="16" y2="20"/><line x1="12" y1="20" x2="3" y2="20"/><line x1="14" y1="2" x2="14" y2="6"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="16" y1="18" x2="16" y2="22"/></svg>`,
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
  'file-text': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  paperclip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`,
  'shield-alert': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
};

// ─── Render Helper ───────────────────────────
function injectIcons(container = document) {
  const elements = container.querySelectorAll('[data-icon]');
  elements.forEach(el => {
    const name = el.getAttribute('data-icon');
    if (ICONS[name]) {
      el.innerHTML = ICONS[name];
      // Basic styling if not already set
      const svg = el.querySelector('svg');
      if (svg) {
        if (!svg.getAttribute('width')) svg.setAttribute('width', '16');
        if (!svg.getAttribute('height')) svg.setAttribute('height', '16');
      }
    }
  });
}

// ─── Mock Data ───────────────────────────────
const MOCK_SCAN_RESULTS = {
  overallThreat: 'high',
  issueCount: 4,
  sections: {
    header: {
      label: 'Header',
      issues: [{
        type: 'reply-to-mismatch',
        severity: 'medium',
        title: 'Reply-to address differs from sender',
        details: 'From: support@paypal.com\nReply-to: scam@evil.com',
        explanation: 'Responses will go to a different address than the apparent sender, a classic phishing tactic.'
      }]
    },
    subject: {
      label: 'Subject',
      issues: [{
        type: 'urgency',
        severity: 'low',
        title: 'Urgency manipulation detected',
        details: 'Subject contains: "URGENT"',
        explanation: 'Creates false pressure for quick action to bypass careful evaluation.'
      }]
    },
    body: {
      label: 'Body',
      issues: []
    },
    links: {
      label: 'Links',
      issues: [
        {
          type: 'homoglyph',
          severity: 'critical',
          title: 'Homoglyph attack detected',
          details: 'Display: "paypal.com"\nActual: "paypa1-secure.xyz"',
          explanation: 'Link text uses lookalike characters (e.g. "1" instead of "l") to deceive you into clicking a malicious URL.'
        },
        {
          type: 'suspicious-tld',
          severity: 'medium',
          title: 'Suspicious domain extension',
          details: 'Uses .xyz TLD',
          explanation: 'This domain extension is commonly abused in phishing campaigns.'
        }
      ]
    },
    attachments: {
      label: 'Attachments',
      issues: []
    }
  },
  timestamp: new Date().toISOString(),
  emailSubject: 'Urgent: Verify Your Account Immediately'
};

const MOCK_HISTORY_EXTRA = [
  {
    overallThreat: 'safe',
    issueCount: 0,
    sections: {
      header: { label: 'Header', issues: [] },
      subject: { label: 'Subject', issues: [] },
      body: { label: 'Body', issues: [] },
      links: { label: 'Links', issues: [] },
      attachments: { label: 'Attachments', issues: [] }
    },
    timestamp: '2026-02-20T13:15:00Z',
    emailSubject: 'Order Confirmation #38291'
  },
  {
    overallThreat: 'medium',
    issueCount: 1,
    sections: {
      header: { label: 'Header', issues: [] },
      subject: {
        label: 'Subject', issues: [{
          type: 'urgency',
          severity: 'medium',
          title: 'Urgency language used',
          details: 'Subject: "Action Required: Password Expiring"',
          explanation: 'Subject uses urgency to compel quick action.'
        }]
      },
      body: { label: 'Body', issues: [] },
      links: { label: 'Links', issues: [] },
      attachments: { label: 'Attachments', issues: [] }
    },
    timestamp: '2026-02-20T10:42:00Z',
    emailSubject: 'Action Required: Password Expiring'
  }
];

// ─── State ───────────────────────────────────
let currentPage = 'scan';
let scanResults = null;
let isScanning = false;
let historyDetailIndex = null;

// ─── Storage Helpers ─────────────────────────
function getSettings() {
  const defaults = {
    enabled: true,
    floatingPopupEnabled: true,
    theme: 'light',
    scanPortions: {
      header: true,
      subject: true,
      body: true,
      footer: true,
      links: true,
      attachments: true
    }
  };

  try {
    const raw = localStorage.getItem('tribunal_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        scanPortions: {
          ...defaults.scanPortions,
          ...(parsed.scanPortions || {})
        }
      };
    }
  } catch (e) { /* fallback */ }

  return defaults;
}

function saveSettings(s) {
  localStorage.setItem('tribunal_settings', JSON.stringify(s));
  showSaveToast();
}

function getHistory() {
  try {
    const raw = localStorage.getItem('tribunal_history');
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fallback */ }
  return [];
}

function saveHistory(h) {
  localStorage.setItem('tribunal_history', JSON.stringify(h.slice(0, 50)));
}

function addToHistory(result) {
  const h = getHistory();
  h.unshift(result);
  saveHistory(h);
}

function clearHistory() {
  localStorage.removeItem('tribunal_history');
}

// ─── Toast ───────────────────────────────────
let toastTimeout = null;
function showSaveToast() {
  const toast = document.getElementById('save-toast');
  if (!toast) return;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 1400);
}

// ─── Theme ───────────────────────────────────
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
}

// ─── Utility ─────────────────────────────────
function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function truncate(str, len = 40) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function threatIcon(level) {
  switch (level) {
    case 'safe': return '✓';
    case 'low': return '○';
    case 'medium': return '⚐';
    case 'high': return '⚠';
    case 'critical': return '✕';
    default: return '?';
  }
}

// ─── Renderers ───────────────────────────────
function renderScanPage() {
  const container = document.getElementById('page-container');
  const userSettings = getSettings();

  if (isScanning) {
    container.innerHTML = `
      <div class="scan-loading page-enter">
        <div class="spinner" aria-label="Scanning"></div>
        <p class="scan-loading-text">Analyzing email…</p>
      </div>`;
    return;
  }

  if (scanResults) {
    const r = scanResults;
    const totalIssues = Object.values(r.sections).reduce((n, s) => n + s.issues.length, 0);
    const threat = r.overallThreat.toUpperCase();

    container.innerHTML = `
      <div class="page-enter">
        <div class="results-summary">
          <div class="results-threat-label">${threatIcon(r.overallThreat)} ${threat} RISK</div>
          <div class="results-issue-count">${totalIssues} issue${totalIssues !== 1 ? 's' : ''} found</div>
        </div>
        <div class="section-group">
          ${Object.entries(r.sections).map(([key, section]) => renderSection(key, section)).join('')}
        </div>
        <div class="results-actions">
          <button class="btn-secondary" id="copy-report-btn" aria-label="Copy scan report">
            <i data-icon="clipboard"></i> Copy Report
          </button>
          <button class="btn-secondary" id="scan-again-btn">
            <i data-icon="rotate-ccw"></i> Scan Again
          </button>
        </div>
      </div>`;
    injectIcons(container);
    return;
  }

  container.innerHTML = `
    <div class="scan-hero page-enter">
      <i data-icon="shield" class="scan-hero-icon"></i>
      <p class="scan-empty-text">Click Scan Now to analyze the current email for phishing threats</p>
      <div class="scan-btn-wrap">
        <button class="btn-primary" id="scan-btn" ${!userSettings.enabled ? 'disabled' : ''} aria-label="Start email scan">
          <i data-icon="scan-search"></i>
          Scan Now
        </button>
        ${!userSettings.enabled ? '<p class="scan-disabled-hint">Enable extension in Settings</p>' : ''}
      </div>
    </div>`;
  injectIcons(container);
}

function renderSection(key, section) {
  const count = section.issues.length;
  const hasIssues = count > 0;

  const sectionIconMap = {
    header: 'mail',
    subject: 'tag',
    body: 'file-text',
    links: 'link',
    attachments: 'paperclip'
  };

  return `
    <div class="section-item">
      <button class="section-header" data-section="${key}" aria-expanded="false" aria-controls="section-body-${key}">
        <i data-icon="chevron-right" class="section-arrow"></i>
        <i data-icon="${sectionIconMap[key] || 'shield'}" class="section-type-icon"></i>
        <span class="section-title">${section.label}</span>
        <span class="section-count ${hasIssues ? 'has-issues' : ''}">${count}</span>
      </button>
      <div class="section-body" id="section-body-${key}">
        ${hasIssues ? `
          <div class="issue-list">
            ${section.issues.map((issue, i) => renderIssueCard(issue, key, i)).join('')}
          </div>
        ` : `
          <div class="no-issues">
            <i data-icon="circle-check"></i> No issues detected
          </div>
        `}
      </div>
    </div>`;
}

function renderIssueCard(issue, sectionKey, index) {
  return `
    <div class="issue-card">
      <button class="issue-card-header" data-issue="${sectionKey}-${index}" aria-expanded="false">
        <span class="issue-card-title">${issue.title}</span>
        <span class="badge badge-${issue.severity}">${issue.severity}</span>
      </button>
      <div class="issue-card-detail" id="issue-detail-${sectionKey}-${index}">
        <div class="issue-card-detail-inner">
          <div class="issue-detail-row">
            <span class="issue-detail-label">Found in</span>
            <span class="issue-detail-value">${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}</span>
          </div>
          ${issue.details.split('\n').map(line => {
    const [label, ...rest] = line.split(': ');
    const value = rest.join(': ');
    return value ? `
              <div class="issue-detail-row">
                <span class="issue-detail-label">${label}</span>
                <span class="issue-detail-value">${value}</span>
              </div>` : `
              <div class="issue-detail-row">
                <span class="issue-detail-value">${label}</span>
              </div>`;
  }).join('')}
          <div class="issue-explanation">${issue.explanation}</div>
        </div>
      </div>
    </div>`;
}

function renderHistoryPage() {
  const container = document.getElementById('page-container');
  const history = getHistory();

  if (historyDetailIndex !== null && history[historyDetailIndex]) {
    const entry = history[historyDetailIndex];
    const totalIssues = Object.values(entry.sections).reduce((n, s) => n + s.issues.length, 0);
    container.innerHTML = `
      <div class="page-enter">
        <button class="back-btn" id="history-back-btn"><i data-icon="arrow-left"></i> Back to History</button>
        <div class="results-summary">
          <div class="results-threat-label">${threatIcon(entry.overallThreat)} ${entry.overallThreat.toUpperCase()} RISK</div>
          <div class="results-issue-count">${totalIssues} issue${totalIssues !== 1 ? 's' : ''} found</div>
          <p style="margin-top:4px;font-size:12px;color:var(--text-muted)">${formatTimestamp(entry.timestamp)} • ${truncate(entry.emailSubject, 50)}</p>
        </div>
        <div class="section-group">
          ${Object.entries(entry.sections).map(([key, section]) => renderSection(key, section)).join('')}
        </div>
      </div>`;
    injectIcons(container);
    return;
  }

  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state page-enter">
        <i data-icon="clock" class="empty-state-icon"></i>
        <p class="empty-state-text">No scans yet. Open an email and click Scan Now to get started.</p>
      </div>`;
    injectIcons(container);
    return;
  }

  container.innerHTML = `
    <div class="page-enter">
      <div class="history-list">
        ${history.map((entry, i) => `
          <div class="history-entry" data-history-index="${i}" role="button" tabindex="0" aria-label="View scan from ${formatTimestamp(entry.timestamp)}">
            <div class="history-entry-info">
              <div class="history-entry-subject">${truncate(entry.emailSubject)}</div>
              <div class="history-entry-time">${formatTimestamp(entry.timestamp)}</div>
            </div>
            <span class="badge badge-${entry.overallThreat}">${entry.overallThreat}</span>
            <i data-icon="chevron-right" class="history-entry-arrow"></i>
          </div>`).join('')}
      </div>
      <div class="history-clear-wrap">
        <button class="btn-danger" id="clear-history-btn"><i data-icon="trash-2"></i> Clear History</button>
      </div>
    </div>`;
  injectIcons(container);
}

function renderSettingsPage() {
  const container = document.getElementById('page-container');
  const s = getSettings();

  container.innerHTML = `
    <div class="page-enter">
      <div class="settings-section">
        <div class="settings-section-title">
          <i data-icon="power"></i> Extension Status
        </div>
        <div class="settings-row">
          <span class="settings-label">Enabled</span>
          <label class="toggle">
            <input type="checkbox" id="setting-enabled" ${s.enabled ? 'checked' : ''} aria-label="Toggle extension enabled">
            <span class="toggle-track"></span>
            <span class="toggle-thumb"></span>
          </label>
        </div>
        <div class="settings-row">
          <div class="settings-label-group">
            <span class="settings-label">Floating popup</span>
            <span class="settings-caption">Show the in-page Tribunal widget on Gmail and Outlook.</span>
          </div>
          <label class="toggle">
            <input type="checkbox" id="setting-floating-popup" ${s.floatingPopupEnabled ? 'checked' : ''} aria-label="Toggle floating popup">
            <span class="toggle-track"></span>
            <span class="toggle-thumb"></span>
          </label>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">
          <i data-icon="palette"></i> Theme
        </div>
        <div class="radio-group">
          <label class="radio-option">
            <input type="radio" name="theme" value="light" ${s.theme === 'light' ? 'checked' : ''}>
            Light
          </label>
          <label class="radio-option">
            <input type="radio" name="theme" value="dark" ${s.theme === 'dark' ? 'checked' : ''}>
            Dark
          </label>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">
          <i data-icon="layout-list"></i> Scan Portions
        </div>
        <div class="checkbox-list">
          ${Object.entries(s.scanPortions).map(([key, val]) => `
            <div class="checkbox-row">
              <label>
                <input type="checkbox" data-portion="${key}" ${val ? 'checked' : ''}>
                ${key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            </div>`).join('')}
        </div>
      </div>

      <hr class="settings-divider">
      <p class="settings-footer">Changes saved automatically</p>
    </div>

    <div class="save-toast" id="save-toast"><i data-icon="check-circle-2"></i> Saved</div>`;
  injectIcons(container);
}

async function renderDebugPage() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="page-enter">
      <div class="settings-section">
        <div class="settings-section-title">
          <i data-icon="file-text"></i> Debug Payload
        </div>
        <p class="debug-intro">Inspect the exact normalized JSON currently being generated before it goes to the API layer.</p>
      </div>
      <div class="scan-loading">
        <div class="spinner" aria-label="Loading debug data"></div>
        <p class="scan-loading-text">Loading debug snapshot?</p>
      </div>
    </div>`;
  injectIcons(container);

  const debug = await getLastScanDebug();
  const updatedLabel = debug.updatedAt ? formatTimestamp(debug.updatedAt) : 'No scan yet';

  container.innerHTML = `
    <div class="page-enter">
      <div class="settings-section">
        <div class="settings-section-title">
          <i data-icon="file-text"></i> Debug Payload
        </div>
        <p class="debug-intro">Inspect the exact normalized JSON currently being generated before it goes to the API layer.</p>
        <p class="debug-meta">Last updated: ${updatedLabel}</p>
      </div>

      <div class="debug-actions">
        <button class="btn-secondary" id="refresh-debug-btn"><i data-icon="rotate-ccw"></i> Refresh</button>
        <button class="btn-secondary" id="copy-debug-payload-btn"><i data-icon="clipboard"></i> Copy Payload</button>
        <button class="btn-secondary" id="copy-debug-result-btn"><i data-icon="clipboard"></i> Copy Result</button>
      </div>

      <div class="debug-card">
        <div class="debug-card-title">Payload JSON</div>
        <pre class="debug-pre">${escapeHtml(prettyJson(debug.payload))}</pre>
      </div>

      <div class="debug-card">
        <div class="debug-card-title">Result JSON</div>
        <pre class="debug-pre">${escapeHtml(prettyJson(debug.result))}</pre>
      </div>
    </div>`;
  injectIcons(container);
}

// ─── Navigation ──────────────────────────────
function navigateTo(page) {
  currentPage = page;
  historyDetailIndex = null;

  document.querySelectorAll('.tab-item').forEach(tab => {
    const isActive = tab.dataset.page === page;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive);
  });

  renderCurrentPage();
}

function renderCurrentPage() {
  const container = document.getElementById('page-container');
  if (!container) return;

  switch (currentPage) {
    case 'scan': renderScanPage(); break;
    case 'history': renderHistoryPage(); break;
    case 'debug': renderDebugPage(); break;
    case 'settings': renderSettingsPage(); break;
  }
}

// ─── Scan Logic ──────────────────────────────
function startScan() {
  isScanning = true;
  scanResults = null;
  renderScanPage();

  setTimeout(() => {
    isScanning = false;
    scanResults = JSON.parse(JSON.stringify(MOCK_SCAN_RESULTS));
    scanResults.timestamp = new Date().toISOString();
    addToHistory(scanResults);
    renderScanPage();
  }, 1800);
}

// ─── Copy Report ─────────────────────────────
function copyReport() {
  if (!scanResults) return;
  const r = scanResults;
  let report = `TRIBUNAL SCAN REPORT\n`;
  report += `═══════════════════════════\n`;
  report += `Threat Level: ${r.overallThreat.toUpperCase()}\n`;
  report += `Issues Found: ${r.issueCount}\n`;
  report += `Scanned: ${formatTimestamp(r.timestamp)}\n`;
  report += `Subject: ${r.emailSubject}\n\n`;

  Object.entries(r.sections).forEach(([key, section]) => {
    report += `── ${section.label} (${section.issues.length}) ──\n`;
    if (section.issues.length === 0) {
      report += `  ✓ No issues\n`;
    } else {
      section.issues.forEach(issue => {
        report += `  ⚠ ${issue.title}\n`;
        report += `    Severity: ${issue.severity}\n`;
        report += `    ${issue.explanation}\n`;
      });
    }
    report += `\n`;
  });

  navigator.clipboard.writeText(report).then(() => {
    const btn = document.getElementById('copy-report-btn');
    if (btn) {
      btn.innerHTML = '<i data-icon="circle-check"></i> Copied!';
      injectIcons(btn);
      setTimeout(() => {
        btn.innerHTML = '<i data-icon="clipboard"></i> Copy Report';
        injectIcons(btn);
      }, 1500);
    }
  });
}

// ─── Event Delegation ────────────────────────
document.addEventListener('click', e => {
  const target = e.target.closest('[data-page]');
  if (target && target.closest('.tab-bar')) {
    navigateTo(target.dataset.page);
    return;
  }

  if (e.target.closest('#scan-btn')) { startScan(); return; }
  if (e.target.closest('#scan-again-btn')) { scanResults = null; renderScanPage(); return; }
  if (e.target.closest('#copy-report-btn')) { copyReport(); return; }
  if (e.target.closest('#refresh-debug-btn')) { renderDebugPage(); return; }

  if (e.target.closest('#copy-debug-payload-btn')) {
    getLastScanDebug().then(debug => navigator.clipboard.writeText(prettyJson(debug.payload)));
    return;
  }

  if (e.target.closest('#copy-debug-result-btn')) {
    getLastScanDebug().then(debug => navigator.clipboard.writeText(prettyJson(debug.result)));
    return;
  }

  const sectionHeader = e.target.closest('.section-header');
  if (sectionHeader) {
    const sectionKey = sectionHeader.dataset.section;
    const body = document.getElementById(`section-body-${sectionKey}`);
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open');
    sectionHeader.setAttribute('aria-expanded', !isOpen);
    return;
  }

  const issueHeader = e.target.closest('.issue-card-header');
  if (issueHeader) {
    const issueKey = issueHeader.dataset.issue;
    const detail = document.getElementById(`issue-detail-${issueKey}`);
    const isOpen = detail.classList.contains('open');
    detail.classList.toggle('open');
    issueHeader.setAttribute('aria-expanded', !isOpen);
    return;
  }

  const historyEntry = e.target.closest('.history-entry');
  if (historyEntry) {
    historyDetailIndex = parseInt(historyEntry.dataset.historyIndex, 10);
    renderHistoryPage();
    return;
  }

  if (e.target.closest('#history-back-btn')) { historyDetailIndex = null; renderHistoryPage(); return; }
  if (e.target.closest('#clear-history-btn')) { clearHistory(); renderHistoryPage(); return; }
});

document.addEventListener('change', e => {
  if (currentPage !== 'settings') return;
  const s = getSettings();

  if (e.target.id === 'setting-enabled') { s.enabled = e.target.checked; saveSettings(s); return; }

  if (e.target.id === 'setting-floating-popup') {
    s.floatingPopupEnabled = e.target.checked;
    saveSettings(s);
    saveWidgetPreferences({ enabled: s.floatingPopupEnabled });
    return;
  }

  if (e.target.name === 'theme') {
    s.theme = e.target.value;
    applyTheme(s.theme);
    saveSettings(s);
    return;
  }

  if (e.target.dataset.portion) {
    s.scanPortions[e.target.dataset.portion] = e.target.checked;
    saveSettings(s);
    return;
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const historyEntry = e.target.closest('.history-entry');
    if (historyEntry) historyEntry.click();
  }
});

// ─── Init ────────────────────────────────────
function init() {
  const s = getSettings();
  applyTheme(s.theme);
  saveWidgetPreferences({ enabled: s.floatingPopupEnabled });

  if (getHistory().length === 0) {
    const seeded = MOCK_HISTORY_EXTRA.map(item => ({ ...item, timestamp: item.timestamp }));
    saveHistory(seeded);
  }

  navigateTo('scan');
  injectIcons(document); // Inject initial header/tab icons
}

init();
