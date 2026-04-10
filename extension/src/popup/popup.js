import {
  getApiConfig,
  clearScanHistory,
  getAuthSession,
  getLastScanDebug,
  getScanHistory,
  saveScanHistory,
  saveWidgetPreferences
} from '../shared/storage.js';
import { RUNTIME_MESSAGES } from '../shared/constants.js';
import {
  loginWithFirebaseAndFlask,
  loginWithGoogleAndFlask,
  logoutFromFirebaseAndFlask,
  sendFirebasePasswordReset,
  signUpWithFirebase
} from '../shared/auth-client.js';

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
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
  'eye-off': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 18 18"/><path d="M10.58 10.58a2 2 0 0 0 2.83 2.83"/><path d="M9.88 5.09A10.94 10.94 0 0 1 12 4.9c5 0 9.27 3.11 11 7.5a11.8 11.8 0 0 1-1.67 2.68"/><path d="M6.61 6.61A11.84 11.84 0 0 0 1 12.4c1.73 4.39 6 7.5 11 7.5 1.87 0 3.63-.44 5.2-1.22"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21a7 7 0 0 0-14 0"/><circle cx="12" cy="8" r="4"/></svg>`,
  power: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`,
  google: `<svg viewBox="0 0 24 24" fill="none"><path d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.2-.9 2.3-1.9 3v2.5h3.1c1.8-1.7 3.1-4.2 3.1-7.3Z" fill="currentColor"/><path d="M12 22c2.7 0 4.9-.9 6.6-2.5l-3.1-2.5c-.9.6-2 .9-3.5.9-2.7 0-4.9-1.8-5.7-4.2H3.1v2.6A10 10 0 0 0 12 22Z" fill="currentColor"/><path d="M6.3 13.7c-.2-.6-.3-1.1-.3-1.7s.1-1.2.3-1.7V7.7H3.1A10 10 0 0 0 2 12c0 1.6.4 3 1.1 4.3l3.2-2.6Z" fill="currentColor"/><path d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9C16.9 2.9 14.7 2 12 2A10 10 0 0 0 3.1 7.7l3.2 2.6c.8-2.4 3-4.2 5.7-4.2Z" fill="currentColor"/></svg>`,
  palette: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.647-.494 2.158-1.006.511-.512 1.158-1.406 2.058-2.31 1.62-.05 3.018-.28 4.194-1.282.871-.741 1.59-1.895 1.59-3.402C22 7.5 17.5 2 12 2z"/></svg>`,
  'layout-list': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><path d="M14 4h7"/><path d="M14 9h7"/><path d="M14 15h7"/><path d="M14 20h7"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  tag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  paperclip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`
};

const SETTINGS_KEY = 'tribunal_settings';
const SUPPORTED_MAIL_HOSTS = [
  'mail.google.com',
  'outlook.cloud.microsoft',
  'outlook.live.com',
  'outlook.office.com',
  'outlook.office365.com'
];
const DEFAULT_SETTINGS = {
  enabled: true,
  floatingPopupEnabled: true,
  theme: 'light',
  scanPortions: { header: true, subject: true, body: true, footer: true, links: true, attachments: true }
};
const AUTH_FORM_MODE_KEY = 'tribunal_auth_form_mode';

let currentPage = 'scan';
let scanResults = null;
let scanError = '';
let scanRequiresRefresh = false;
let isScanning = false;
let scanStageIndex = 0;
let scanStageVersion = 0;
let historyDetailIndex = null;
let toastTimeout = null;
let authSession = null;
let authFormMode = localStorage.getItem(AUTH_FORM_MODE_KEY) || 'login';
let authError = '';
let authNotice = '';
let isAuthSubmitting = false;
let passwordsVisible = false;
let authDraft = {
  email: '',
  password: '',
  confirmPassword: ''
};
let remoteHistoryHydrated = false;

const SCAN_STAGES = ['Extracting', 'Sending', 'Analyzing', 'Finalizing'];

function isConnectionLostError(message = '') {
  return /receiving end does not exist|could not establish connection|extension context invalidated|connection was lost/i.test(String(message));
}

async function wakeBackgroundServiceWorker() {
  const retries = 3;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: RUNTIME_MESSAGES.HEARTBEAT }, (response) => {
        resolve({
          response,
          runtimeError: chrome.runtime.lastError?.message || ''
        });
      });
    });

    if (!result.runtimeError) {
      return true;
    }

    if (attempt < retries) {
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
  }

  return false;
}

function setScanStage(index) {
  scanStageIndex = Math.max(0, Math.min(index, SCAN_STAGES.length - 1));
  if (currentPage === 'scan') {
    renderScanPage();
  }
}

async function advanceScanStage(index, minimumDelayMs = 0, version = scanStageVersion) {
  if (!isScanning || version !== scanStageVersion) {
    return;
  }

  setScanStage(index);

  if (minimumDelayMs > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, minimumDelayMs));
  }
}

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

function getResultSource(result) {
  const source = String(result?.source || '').toLowerCase();
  if (source === 'mock') {
    return 'mock';
  }

  if (source === 'api') {
    return 'api';
  }

  return result ? 'api' : 'unknown';
}

function getResultSourceLabel(result) {
  const source = getResultSource(result);

  if (source === 'mock') {
    return 'Mock Preview';
  }

  if (source === 'api') {
    return 'API Response';
  }

  return 'Unknown Source';
}

function normalizeSeverity(value = '') {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high' || normalized === 'critical') return 'high';
  if (normalized === 'medium') return 'medium';
  if (normalized === 'low') return 'low';
  return 'low';
}

function threatFromScore(score = 0) {
  const numeric = Number(score) || 0;
  if (numeric >= 75) return 'critical';
  if (numeric >= 55) return 'high';
  if (numeric >= 30) return 'medium';
  if (numeric >= 10) return 'low';
  return 'safe';
}

function mapFindingToIssue(finding = {}) {
  const target = String(finding.target || '').trim();
  const description = String(finding.description || '').trim();
  return {
    severity: normalizeSeverity(finding.severity),
    title: description || 'Flagged issue',
    details: target ? `Target: ${target}` : '',
    explanation: ''
  };
}

function mapRemoteSections(sections = {}) {
  return {
    header: { label: 'Header', issues: (sections?.Header?.findings || []).map(mapFindingToIssue) },
    subject: { label: 'Subject', issues: (sections?.Subject?.findings || []).map(mapFindingToIssue) },
    body: { label: 'Body', issues: (sections?.Body?.findings || []).map(mapFindingToIssue) },
    links: { label: 'Links', issues: (sections?.Links?.findings || []).map(mapFindingToIssue) },
    attachments: { label: 'Attachments', issues: [] }
  };
}

function mapRemoteReportToHistoryEntry(report = {}) {
  const score = Number(report.overallRiskScore) || 0;
  return {
    source: 'api',
    status: 'completed',
    overallThreat: threatFromScore(score),
    overallRiskScore: score,
    issueCount: 0,
    sections: mapRemoteSections(report.sections || {}),
    timestamp: report.savedAt || new Date().toISOString(),
    emailSubject: report.subject || 'Current message',
    message: 'Loaded from server history.',
    reportId: report.id || null,
    headerInspectionResult: report.headerInspectionResult || null,
    aiAnalysis: report.aiAnalysis || null
  };
}

function mergeHistory(localHistory = [], remoteHistory = []) {
  const merged = [...localHistory];
  const seenKeys = new Set(
    merged.map((entry) => entry.reportId || `${entry.timestamp || ''}::${entry.emailSubject || ''}`)
  );

  remoteHistory.forEach((entry) => {
    const key = entry.reportId || `${entry.timestamp || ''}::${entry.emailSubject || ''}`;
    if (!seenKeys.has(key)) {
      merged.push(entry);
      seenKeys.add(key);
    }
  });

  merged.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  return merged.slice(0, 50);
}

async function hydrateRemoteHistoryIfNeeded() {
  if (remoteHistoryHydrated || !hasAuthSession()) {
    return;
  }

  remoteHistoryHydrated = true;

  try {
    const config = await getApiConfig();
    if (!config?.enabled || !config?.endpoint) {
      return;
    }

    const reportsEndpoint = String(config.endpoint).replace(/\/scan\/?$/, '/reports?limit=50');
    const response = await fetch(reportsEndpoint, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    const remoteReports = Array.isArray(payload) ? payload : [];
    const mappedRemote = remoteReports
      .filter((report) => String(report?.type || '').toLowerCase() !== 'link_scan')
      .map(mapRemoteReportToHistoryEntry);

    if (!mappedRemote.length) {
      return;
    }

    const local = await getScanHistory();
    const merged = mergeHistory(local, mappedRemote);
    await saveScanHistory(merged);
  } catch {
    // Best-effort hydration; local history continues to work even when server history fetch fails.
  }
}

function getAuthDisplayName() {
  return authSession?.user?.email || authSession?.user?.uid || 'Authenticated user';
}

function getAuthProviderLabel() {
  const provider = authSession?.user?.provider || 'firebase';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function setAuthFormMode(mode) {
  authFormMode = mode === 'signup' ? 'signup' : 'login';
  passwordsVisible = false;
  authDraft.password = '';
  authDraft.confirmPassword = '';
  localStorage.setItem(AUTH_FORM_MODE_KEY, authFormMode);
}

async function syncAuthState() {
  authSession = await getAuthSession();
}

function renderAuthMessage() {
  if (authError) {
    return `<div class="auth-message auth-message-error">${escapeHtml(authError)}</div>`;
  }

  if (authNotice) {
    return `<div class="auth-message auth-message-success">${escapeHtml(authNotice)}</div>`;
  }

  return '';
}

function hasAuthSession() {
  return Boolean(authSession?.accessToken);
}

function renderAuthPage() {
  return `
    <div class="auth-page page-enter">
      <div class="auth-page-hero">
        <h2 class="auth-page-title">Sign in to use Tribunal</h2>
        <p class="auth-page-copy">Log in to analyze phishing emails with Tribunal.</p>
      </div>

      <div class="auth-card auth-page-card">
        <div class="auth-mode-switch" role="tablist" aria-label="Authentication mode">
          <button class="auth-mode-btn ${authFormMode === 'login' ? 'active' : ''}" data-auth-mode="login" type="button">Login</button>
          <button class="auth-mode-btn ${authFormMode === 'signup' ? 'active' : ''}" data-auth-mode="signup" type="button">Sign Up</button>
        </div>

        <form id="auth-form" class="auth-form">
          <label class="auth-field">
            <span class="auth-field-label">Email</span>
            <input type="email" id="auth-email" class="auth-input" autocomplete="username" placeholder="you@example.com" value="${escapeHtml(authDraft.email)}" required />
          </label>

          <label class="auth-field">
            <span class="auth-field-label">Password</span>
            <div class="auth-password-wrap">
              <input type="${passwordsVisible ? 'text' : 'password'}" id="auth-password" class="auth-input auth-input-password" autocomplete="${authFormMode === 'login' ? 'current-password' : 'new-password'}" placeholder="Enter password" value="${escapeHtml(authDraft.password)}" required />
              <button class="auth-password-toggle" id="auth-password-toggle" type="button" aria-label="${passwordsVisible ? 'Hide password' : 'Show password'}">
                <i data-icon="${passwordsVisible ? 'eye-off' : 'eye'}"></i>
              </button>
            </div>
          </label>

          ${authFormMode === 'signup' ? `
            <label class="auth-field">
              <span class="auth-field-label">Confirm password</span>
              <div class="auth-password-wrap">
                <input type="${passwordsVisible ? 'text' : 'password'}" id="auth-confirm-password" class="auth-input auth-input-password" autocomplete="new-password" placeholder="Confirm password" value="${escapeHtml(authDraft.confirmPassword)}" required />
                <button class="auth-password-toggle" data-auth-toggle="confirm" type="button" aria-label="${passwordsVisible ? 'Hide password' : 'Show password'}">
                  <i data-icon="${passwordsVisible ? 'eye-off' : 'eye'}"></i>
                </button>
              </div>
            </label>
          ` : ''}

          ${renderAuthMessage()}

          <button class="btn-primary auth-action-btn" id="auth-submit-btn" type="submit" ${isAuthSubmitting ? 'disabled' : ''}>
            <i data-icon="mail"></i>
            ${isAuthSubmitting ? (authFormMode === 'signup' ? 'Creating account...' : 'Signing in...') : (authFormMode === 'signup' ? 'Create Account' : 'Login')}
          </button>
        </form>

        ${authFormMode === 'login' ? `
          <div class="auth-divider"><span>or</span></div>
          <button class="btn-secondary auth-action-btn auth-google-btn" id="auth-google-btn" type="button" aria-disabled="true">
            <i data-icon="google"></i>
            Sign in with Google
          </button>
          
        ` : ''}

        ${authFormMode === 'login' ? `
          <button class="auth-inline-link" id="auth-reset-btn" type="button" ${isAuthSubmitting ? 'disabled' : ''}>
            Forgot password?
          </button>
        ` : `
          <p class="auth-footnote">After signup, we’ll send a verification email. Log in after you verify it.</p>
        `}
      </div>
    </div>`;
}

function renderProfilePage() {
  if (!hasAuthSession()) {
    return `
      <div class="empty-state page-enter">
        <i data-icon="user" class="empty-state-icon"></i>
        <p class="empty-state-text">Log in to view your Tribunal profile and manage your session.</p>
        <div class="scan-btn-wrap">
          <button class="btn-primary" id="open-auth-btn"><i data-icon="mail"></i> Login to Use Profile</button>
        </div>
      </div>`;
  }

  const createdAt = authSession?.user?.created_at || authSession?.loggedInAt || null;

  return `
    <div class="page-enter">
      <div class="profile-hero">
        <div class="profile-avatar"><i data-icon="user"></i></div>
        <div class="profile-title">Your Profile</div>
        <div class="profile-subtitle">Signed in and ready to scan.</div>
      </div>

      <div class="auth-card">
        <div class="auth-session-row">
          <span class="auth-session-label">Email</span>
          <span class="auth-session-value">${escapeHtml(getAuthDisplayName())}</span>
        </div>
        <div class="auth-session-row">
          <span class="auth-session-label">Signed in</span>
          <span class="auth-session-value">${escapeHtml(formatTimestamp(authSession?.loggedInAt || new Date().toISOString()))}</span>
        </div>
        ${createdAt ? `
          <div class="auth-session-row">
            <span class="auth-session-label">Account created</span>
            <span class="auth-session-value">${escapeHtml(formatTimestamp(createdAt))}</span>
          </div>
        ` : ''}
        ${renderAuthMessage()}
        <button class="btn-secondary auth-action-btn" id="auth-logout-btn" ${isAuthSubmitting ? 'disabled' : ''}>
          <i data-icon="power"></i> ${isAuthSubmitting ? 'Signing out...' : 'Logout'}
        </button>
      </div>
    </div>`;
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
      <div class="results-source">Source: ${escapeHtml(getResultSourceLabel(result))}</div>
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

  if (!hasAuthSession()) {
    container.innerHTML = `<div class="empty-state page-enter"><i data-icon="shield" class="empty-state-icon"></i><p class="empty-state-text">Scan is available after login. You can still explore the popup and adjust settings.</p><div class="scan-btn-wrap"><button class="btn-primary" id="open-auth-btn"><i data-icon="user"></i> Login to Use Scan</button></div></div>`;
    injectIcons(container);
    return;
  }

  if (isScanning) {
    const stage = SCAN_STAGES[Math.min(scanStageIndex, SCAN_STAGES.length - 1)] || 'Analyzing';
    container.innerHTML = `<div class="scan-loading page-enter"><div class="spinner" aria-label="Scanning"></div><p class="scan-loading-text">${escapeHtml(stage)} current email...</p></div>`;
    return;
  }

  if (scanResults) {
    container.innerHTML = `<div class="page-enter">${renderResultView(scanResults)}</div>`;
    injectIcons(container);
    return;
  }

  if (scanError) {
    container.innerHTML = `<div class="error-state page-enter"><i data-icon="shield" class="empty-state-icon"></i><p class="error-state-msg">${escapeHtml(scanError)}</p><button class="btn-primary" id="scan-btn" ${!settings.enabled ? 'disabled' : ''}><i data-icon="scan-search"></i> Try Again</button>${scanRequiresRefresh ? '<button class="btn-secondary" id="refresh-mail-tab-btn"><i data-icon="rotate-ccw"></i> Refresh Mail Tab</button>' : ''}</div>`;
    injectIcons(container);
    return;
  }

  container.innerHTML = `<div class="scan-hero page-enter"><i data-icon="shield" class="scan-hero-icon"></i><p class="scan-empty-text">Open Gmail or Outlook in the active tab, then click Scan Now to analyze the current email.</p><div class="scan-btn-wrap"><button class="btn-primary" id="scan-btn" ${!settings.enabled ? 'disabled' : ''}><i data-icon="scan-search"></i> Scan Now</button>${!settings.enabled ? '<p class="scan-disabled-hint">Enable extension in Settings</p>' : ''}</div></div>`;
  injectIcons(container);
}

async function renderHistoryPage() {
  const container = document.getElementById('page-container');

  if (!hasAuthSession()) {
    container.innerHTML = `<div class="empty-state page-enter"><i data-icon="clock" class="empty-state-icon"></i><p class="empty-state-text">History will appear here after you log in and complete scans.</p></div>`;
    injectIcons(container);
    return;
  }

  await hydrateRemoteHistoryIfNeeded();
  const history = await getScanHistory();

  if (historyDetailIndex !== null && history[historyDetailIndex]) {
    const result = history[historyDetailIndex];
    const issueCount = getIssueCount(result);
    container.innerHTML = `<div class="page-enter"><button class="back-btn" id="history-back-btn"><i data-icon="arrow-left"></i> Back to History</button><div class="results-summary"><div class="results-threat-label">${escapeHtml(String(result.overallThreat || 'safe').toUpperCase())} RISK</div><div class="results-issue-count">${issueCount} issue${issueCount === 1 ? '' : 's'} found</div><div class="results-source">Source: ${escapeHtml(getResultSourceLabel(result))}</div><p style="margin-top:4px;font-size:12px;color:var(--text-muted)">${escapeHtml(formatTimestamp(result.timestamp))} - ${escapeHtml(truncate(result.emailSubject || 'Current message', 52))}</p></div><div class="section-group">${Object.entries(result.sections || {}).map(([key, section]) => renderSection(key, section)).join('')}</div></div>`;
    injectIcons(container);
    return;
  }

  if (!history.length) {
    container.innerHTML = `<div class="empty-state page-enter"><i data-icon="clock" class="empty-state-icon"></i><p class="empty-state-text">No completed scans yet. Run a real scan from the Scan tab to populate history.</p></div>`;
    injectIcons(container);
    return;
  }

  container.innerHTML = `<div class="page-enter"><div class="history-list">${history.map((entry, index) => `<div class="history-entry" data-history-index="${index}" role="button" tabindex="0" aria-label="View scan from ${escapeHtml(formatTimestamp(entry.timestamp))}"><div class="history-entry-info"><div class="history-entry-subject">${escapeHtml(truncate(entry.emailSubject || 'Current message'))}</div><div class="history-entry-time">${escapeHtml(formatTimestamp(entry.timestamp))} - ${escapeHtml(getResultSourceLabel(entry))}</div></div><span class="badge badge-${escapeHtml(entry.overallThreat || 'safe')}">${escapeHtml(entry.overallThreat || 'safe')}</span><i data-icon="chevron-right" class="history-entry-arrow"></i></div>`).join('')}</div><div class="history-clear-wrap"><button class="btn-danger" id="clear-history-btn"><i data-icon="trash-2"></i> Clear History</button></div></div>`;
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

  if (!hasAuthSession()) {
    container.innerHTML = `<div class="empty-state page-enter"><i data-icon="file-text" class="empty-state-icon"></i><p class="empty-state-text">Debug data is available after login and after running a scan.</p></div>`;
    injectIcons(container);
    return;
  }

  container.innerHTML = `<div class="page-enter"><div class="settings-section"><div class="settings-section-title"><i data-icon="file-text"></i> Debug Payload</div><p class="debug-intro">Inspect the exact normalized JSON produced by the most recent scan.</p></div><div class="scan-loading"><div class="spinner" aria-label="Loading debug data"></div><p class="scan-loading-text">Loading debug snapshot...</p></div></div>`;
  injectIcons(container);

  const debug = await getLastScanDebug();
  container.innerHTML = `<div class="page-enter"><div class="settings-section"><div class="settings-section-title"><i data-icon="file-text"></i> Debug Payload</div><p class="debug-intro">Inspect the exact normalized JSON produced by the most recent scan.</p><p class="debug-meta">Last updated: ${escapeHtml(debug.updatedAt ? formatTimestamp(debug.updatedAt) : 'No scan yet')}</p><p class="debug-meta">Result source: ${escapeHtml(debug.result ? getResultSourceLabel(debug.result) : 'No result yet')}</p></div><div class="debug-actions"><button class="btn-secondary" id="refresh-debug-btn"><i data-icon="rotate-ccw"></i> Refresh</button><button class="btn-secondary" id="copy-debug-payload-btn"><i data-icon="clipboard"></i> Copy Payload</button><button class="btn-secondary" id="copy-debug-result-btn"><i data-icon="clipboard"></i> Copy Result</button></div><div class="debug-card"><div class="debug-card-title">Payload JSON</div><pre class="debug-pre">${escapeHtml(prettyJson(debug.payload))}</pre></div><div class="debug-card"><div class="debug-card-title">Result JSON</div><pre class="debug-pre">${escapeHtml(prettyJson(debug.result))}</pre></div></div>`;
  injectIcons(container);
}
function navigateTo(page) {
  currentPage = page;
  historyDetailIndex = null;

  document.querySelectorAll('.tab-item').forEach((tab) => {
    const active = tab.dataset.page === currentPage;
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

  if (currentPage === 'profile') {
    const container = document.getElementById('page-container');
    container.innerHTML = hasAuthSession() ? renderProfilePage() : renderAuthPage();
    injectIcons(container);
    return;
  }

  if (currentPage === 'settings') {
    renderSettingsPage();
    return;
  }

  renderScanPage();
}

function togglePasswordVisibility() {
  passwordsVisible = !passwordsVisible;
  renderCurrentPage();
}

function getProviderFromTabUrl(tabUrl = '') {
  const url = String(tabUrl || '');
  if (url.startsWith('https://mail.google.com/')) {
    return 'gmail';
  }
  if (
    url.startsWith('https://outlook.cloud.microsoft/') ||
    url.startsWith('https://outlook.live.com/') ||
    url.startsWith('https://outlook.office.com/') ||
    url.startsWith('https://outlook.office365.com/')
  ) {
    return 'outlook';
  }
  return '';
}

function getContentScriptFilesForProvider(provider) {
  const manifest = chrome.runtime.getManifest();
  const contentScripts = Array.isArray(manifest?.content_scripts) ? manifest.content_scripts : [];

  if (provider === 'gmail') {
    const entry = contentScripts.find((script) =>
      Array.isArray(script.matches) && script.matches.some((match) => match.includes('mail.google.com'))
    );
    return Array.isArray(entry?.js) ? entry.js : [];
  }

  if (provider === 'outlook') {
    const entry = contentScripts.find((script) =>
      Array.isArray(script.matches) && script.matches.some((match) => match.includes('outlook.'))
    );
    return Array.isArray(entry?.js) ? entry.js : [];
  }

  return [];
}

async function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      resolve({
        response,
        runtimeError: chrome.runtime.lastError?.message || ''
      });
    });
  });
}

async function injectProviderContentScript(tabId, provider) {
  if (!chrome.scripting?.executeScript) {
    return false;
  }

  const files = getContentScriptFilesForProvider(provider);
  if (!files.length) {
    return false;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files
    });
    return true;
  } catch {
    return false;
  }
}

async function ensureTabContentReceiver(tabId, tabUrl) {
  const provider = getProviderFromTabUrl(tabUrl);
  if (!provider) {
    return false;
  }

  // First, attempt a silent readiness ping.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const ping = await sendMessageToTab(tabId, { type: RUNTIME_MESSAGES.PING_CONTENT });
    if (!ping.runtimeError) {
      return true;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 180));
  }

  // If receiver is missing, attempt to inject the provider content script once.
  const injected = await injectProviderContentScript(tabId, provider);
  if (!injected) {
    return false;
  }

  await new Promise((resolve) => window.setTimeout(resolve, 220));
  const pingAfterInject = await sendMessageToTab(tabId, { type: RUNTIME_MESSAGES.PING_CONTENT });
  return !pingAfterInject.runtimeError;
}

async function requestActiveScan() {
  await wakeBackgroundServiceWorker();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error('No active tab available. Open Gmail or Outlook and try again.');
  }

  const tabUrl = tab.url || '';
  const supported = SUPPORTED_MAIL_HOSTS.some((host) => tabUrl.startsWith(`https://${host}/`));
  if (!supported) {
    throw new Error('Open Gmail or Outlook in the active tab, then run the scan again.');
  }

  const receiverReady = await ensureTabContentReceiver(tab.id, tabUrl);
  if (!receiverReady) {
    throw new Error('Mail page is not ready yet. Refresh the Gmail/Outlook tab once, then try again.');
  }

  await advanceScanStage(1, 200);

  // Firefox can briefly report "Receiving end does not exist" while the content script
  // is still attaching after tab updates. Retry a few times before failing hard.
  const maxAttempts = 5;
  const retryDelayMs = 450;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: RUNTIME_MESSAGES.REQUEST_ACTIVE_SCAN }, (response) => {
        const runtimeError = chrome.runtime.lastError?.message || '';
        if (runtimeError) {
          resolve({ ok: false, runtimeError });
          return;
        }
        resolve({ ok: true, response });
      });
    });

    if (!result.ok) {
      const isNoReceiver = /Receiving end does not exist/i.test(result.runtimeError);
      if (isNoReceiver && attempt < maxAttempts) {
        await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs));
        continue;
      }
      throw new Error('Mail tab connection was lost. Refresh the mail tab once, then try scan again.');
    }

    if (!result.response) {
      if (attempt < maxAttempts) {
        await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs));
        continue;
      }
      throw new Error('No scan response was returned from the active tab.');
    }

    if (result.response.ok === false) {
      throw new Error(result.response.error || 'The current message could not be scanned.');
    }

    return result.response.result || result.response;
  }

  throw new Error('Mail tab connection was lost. Please refresh the mail tab and try again.');
}

async function startScan() {
  if (!hasAuthSession()) {
    authError = 'Log in first to run scans.';
    authNotice = '';
    renderCurrentPage();
    return;
  }

  isScanning = true;
  scanStageVersion += 1;
  const currentScanVersion = scanStageVersion;
  setScanStage(0);
  scanResults = null;
  scanError = '';
  scanRequiresRefresh = false;
  renderScanPage();

  try {
    await advanceScanStage(0, 250, currentScanVersion);
    const result = await requestActiveScan();
    await advanceScanStage(2, 350, currentScanVersion);
    await advanceScanStage(3, 250, currentScanVersion);
    scanResults = result;
  } catch (error) {
    scanError = error.message || 'Unable to scan the current message.';
    scanRequiresRefresh = isConnectionLostError(scanError);
  } finally {
    isScanning = false;
    scanStageVersion += 1;
    scanStageIndex = 0;
    renderScanPage();
  }
}

async function refreshActiveMailTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    scanError = 'No active mail tab found. Open Gmail or Outlook and try again.';
    scanRequiresRefresh = false;
    renderScanPage();
    return;
  }

  await chrome.tabs.reload(tab.id);
  scanError = 'Mail tab refreshed. Wait for the message to load, then tap Try Again.';
  scanRequiresRefresh = false;
  renderScanPage();
}

async function handleAuthSubmit() {
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const confirmInput = document.getElementById('auth-confirm-password');

  const email = emailInput?.value?.trim() || '';
  const password = passwordInput?.value || '';
  const confirmPassword = confirmInput?.value || '';

  authDraft.email = email;
  authDraft.password = password;
  authDraft.confirmPassword = confirmPassword;

  authError = '';
  authNotice = '';

  if (!email || !password) {
    authError = 'Email and password are both required.';
    renderCurrentPage();
    return;
  }

  if (authFormMode === 'signup') {
    if (password.length < 6) {
      authError = 'Use at least 6 characters for the password.';
      renderCurrentPage();
      return;
    }

    if (password !== confirmPassword) {
      authError = 'Passwords do not match.';
      renderCurrentPage();
      return;
    }
  }

  isAuthSubmitting = true;
  renderCurrentPage();

  try {
    if (authFormMode === 'signup') {
      await signUpWithFirebase({ email, password });
      authNotice = 'Account created. Check your inbox, verify your email, then log in.';
      setAuthFormMode('login');
      authDraft.password = '';
      authDraft.confirmPassword = '';
    } else {
      await loginWithFirebaseAndFlask({ email, password });
      await syncAuthState();
      authNotice = 'Logged in successfully.';
      navigateTo('scan');
      authDraft = { email: '', password: '', confirmPassword: '' };
    }
  } catch (error) {
    authError = error.message || `Unable to ${authFormMode === 'signup' ? 'sign up' : 'log in'} right now.`;
  } finally {
    isAuthSubmitting = false;
    renderCurrentPage();
  }
}

async function handleLogout() {
  authError = '';
  authNotice = '';
  isAuthSubmitting = true;
  renderCurrentPage();

  try {
    await logoutFromFirebaseAndFlask();
    await syncAuthState();
    remoteHistoryHydrated = false;
    authNotice = 'Logged out locally.';
    navigateTo('profile');
    authDraft = { email: '', password: '', confirmPassword: '' };
  } catch (error) {
    authError = error.message || 'Unable to log out right now.';
  } finally {
    isAuthSubmitting = false;
    renderCurrentPage();
  }
}

async function handleGoogleAuth() {
  authError = '';
  authNotice = '';
  isAuthSubmitting = true;
  renderCurrentPage();

  try {
    await loginWithGoogleAndFlask();
    await syncAuthState();
    authNotice = 'Logged in with Google successfully.';
    navigateTo('scan');
    authDraft = { email: '', password: '', confirmPassword: '' };
  } catch (error) {
    authError = error.message || 'Unable to continue with Google right now.';
  } finally {
    isAuthSubmitting = false;
    renderCurrentPage();
  }
}
async function handlePasswordReset() {
  const emailInput = document.getElementById('auth-email');
  const email = emailInput?.value?.trim() || '';

  authDraft.email = email;

  authError = '';
  authNotice = '';

  if (!email) {
    authError = 'Enter your email first, then request a reset link.';
    renderCurrentPage();
    return;
  }

  isAuthSubmitting = true;
  renderCurrentPage();

  try {
    await sendFirebasePasswordReset(email);
    authNotice = 'Password reset email sent. Check your inbox.';
  } catch (error) {
    authError = error.message || 'Unable to send a reset email right now.';
  } finally {
    isAuthSubmitting = false;
    renderCurrentPage();
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
document.addEventListener('click', async (event) => {
  const navTarget = event.target.closest('[data-page]');
  if (navTarget && navTarget.closest('.tab-bar')) {
    navigateTo(navTarget.dataset.page);
    return;
  }

  if (event.target.closest('#scan-btn')) {
    startScan();
    return;
  }

  if (event.target.closest('#refresh-mail-tab-btn')) {
    refreshActiveMailTab();
    return;
  }

  if (event.target.closest('#open-auth-btn')) {
    navigateTo('profile');
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
    await renderHistoryPage();
    return;
  }

  if (event.target.closest('#history-back-btn')) {
    historyDetailIndex = null;
    await renderHistoryPage();
    return;
  }

  if (event.target.closest('#clear-history-btn')) {
    await clearScanHistory();
    remoteHistoryHydrated = false;
    historyDetailIndex = null;
    await renderHistoryPage();
    return;
  }

  const authModeTarget = event.target.closest('[data-auth-mode]');
  if (authModeTarget) {
    authError = '';
    authNotice = '';
    setAuthFormMode(authModeTarget.dataset.authMode);
    renderCurrentPage();
    return;
  }

  if (event.target.closest('#auth-password-toggle') || event.target.closest('[data-auth-toggle="confirm"]')) {
    togglePasswordVisibility();
    return;
  }

  if (event.target.closest('#auth-reset-btn')) {
    handlePasswordReset();
    return;
  }

  if (event.target.closest('#auth-google-btn')) {
    handleGoogleAuth();
    return;
  }

  if (event.target.closest('#auth-logout-btn')) {
    handleLogout();
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
    return;
  }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'auth-email') {
    authDraft.email = event.target.value;
    return;
  }

  if (event.target.id === 'auth-password') {
    authDraft.password = event.target.value;
    return;
  }

  if (event.target.id === 'auth-confirm-password') {
    authDraft.confirmPassword = event.target.value;
  }
});

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'auth-form') {
    return;
  }

  event.preventDefault();
  handleAuthSubmit();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const historyEntry = event.target.closest('.history-entry');
    if (historyEntry) {
      historyEntry.click();
    }
  }
});

async function init() {
  const settings = getSettings();
  await syncAuthState();
  applyTheme(settings.theme);
  saveWidgetPreferences({ enabled: settings.floatingPopupEnabled });
  navigateTo('scan');
  injectIcons(document);
}

init();

