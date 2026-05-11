import { getWidgetState, saveWidgetState } from '../shared/storage.js';

export const WIDGET_HOST_ID = 'tribunal-floating-widget-host';
export const WIDGET_BUBBLE_HOST_ID = 'tribunal-floating-widget-bubble-host';

const ICONS = {
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`
};

function getLogoUrl() {
  return chrome.runtime.getURL('logo.png');
}

function getFallbackIconUrl() {
  return chrome.runtime.getURL('icons/icon48.png');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function countIssues(sections = {}) {
  return Object.values(sections).reduce((total, section) => total + (section?.issues?.length || 0), 0);
}

function getPanelPosition() {
  return { right: 24, bottom: 24 };
}

function renderIssueCard(issue, sectionKey, index) {
  const issueId = `${sectionKey}-${index}`;
  const detailLines = String(issue.details || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(': ');
      const value = rest.join(': ');

      if (value) {
        return `
          <div class="issue-detail-row">
            <span class="issue-detail-label">${escapeHtml(label)}</span>
            <span class="issue-detail-value">${escapeHtml(value)}</span>
          </div>
        `;
      }

      return `
        <div class="issue-detail-row">
          <span class="issue-detail-value">${escapeHtml(label)}</span>
        </div>
      `;
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
          <div class="issue-detail-row">
            <span class="issue-detail-label">Found in</span>
            <span class="issue-detail-value">${escapeHtml(sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1))}</span>
          </div>
          ${detailLines}
          ${issue.explanation ? `<div class="issue-explanation">${escapeHtml(issue.explanation)}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderSection(key, section) {
  const count = section?.issues?.length || 0;
  const hasIssues = count > 0;

  return `
    <div class="section-item">
      <button class="section-header" data-section="${key}" aria-expanded="false" aria-controls="section-body-${key}">
        <i class="section-arrow">${ICONS.chevron}</i>
        <span class="section-title">${escapeHtml(section.label || key)}</span>
        <span class="section-count ${hasIssues ? 'has-issues' : ''}">${count}</span>
      </button>
      <div class="section-body" id="section-body-${key}">
        ${hasIssues ? `
          <div class="issue-list">
            ${section.issues.map((issue, index) => renderIssueCard(issue, key, index)).join('')}
          </div>
        ` : `
          <div class="no-issues">
            <i>${ICONS.check}</i>
            <span>No issues detected</span>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderResult(result) {
  const issueCount = countIssues(result.sections || {});

  return `
    <div class="results-summary">
      <div class="results-threat-label">${escapeHtml(String(result.overallThreat || 'safe').toUpperCase())} RISK</div>
      <div class="results-issue-count">${issueCount} issue${issueCount === 1 ? '' : 's'} found</div>
    </div>
    <div class="section-group">
      ${Object.entries(result.sections || {}).map(([key, section]) => renderSection(key, section)).join('')}
    </div>
  `;
}

function renderMessageCard(title, message) {
  return `
    <div class="message-card">
      <div class="message-card-title">${escapeHtml(title)}</div>
      <div class="message-card-copy">${escapeHtml(message)}</div>
    </div>
  `;
}

function createPanelMarkup(provider) {
  return `
    <style>
      :host {
        all: initial;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      :host, button, input {
        font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      }

      .panel {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 320px;
        max-width: min(320px, calc(100vw - 24px));
        max-height: calc(100vh - 48px);
        background: #0c0c0c;
        color: #ececec;
        border: 1px solid #222222;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
        pointer-events: auto;
      }

      .panel.hidden {
        display: none;
      }

      .header {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 74px;
        padding: 16px 20px;
        border-bottom: 1px solid #222222;
        background: #0c0c0c;
      }

      .header-logo {
        position: absolute;
        left: 20px;
        width: 28px;
        height: 28px;
        object-fit: contain;
      }

      .header-title {
        font-size: 18px;
        font-weight: 700;
        color: #ececec;
        letter-spacing: -0.04em;
        text-transform: lowercase;
      }

      .header-copy {
        position: absolute;
        left: 58px;
        top: 42px;
        font-size: 12px;
        line-height: 1.4;
        color: #787878;
      }

      .minimize {
        position: absolute;
        right: 16px;
        width: 36px;
        height: 36px;
        border-radius: 999px;
        border: 1px solid #333333;
        background: #181818;
        color: #b0b0b0;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
      }

      .body {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        padding: 20px;
      }

      .actions {
        padding: 12px 20px 20px;
        border-top: 1px solid #222222;
        background: #0c0c0c;
      }

      .status-note {
        margin-bottom: 12px;
      }

      .status-note.hidden,
      .content.hidden {
        display: none;
      }

      .message-card {
        border: 1px solid #222222;
        border-radius: 12px;
        background: #141414;
        padding: 12px 14px;
      }

      .message-card-title {
        font-size: 13px;
        font-weight: 600;
        color: #ececec;
      }

      .message-card-copy {
        margin-top: 6px;
        font-size: 12px;
        line-height: 1.6;
        color: #787878;
      }

      .content {
        min-height: 0;
      }

      .results-summary {
        text-align: center;
        padding: 4px 0 20px;
      }

      .results-threat-label {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .results-issue-count {
        font-size: 12px;
        color: #787878;
      }

      .section-group {
        display: flex;
        flex-direction: column;
        border: 1px solid #222222;
        border-radius: 12px;
        overflow: hidden;
      }

      .section-item + .section-item {
        border-top: 1px solid #222222;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px 16px;
        background: #141414;
        border: none;
        color: #b0b0b0;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-size: 12px;
        font-weight: 600;
        text-align: left;
        cursor: pointer;
      }

      .section-arrow {
        width: 14px;
        height: 14px;
        display: inline-flex;
        color: #505050;
        transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      .section-arrow svg,
      .no-issues svg {
        width: 14px;
        height: 14px;
      }

      .section-header[aria-expanded="true"] .section-arrow {
        transform: rotate(90deg);
      }

      .section-title {
        flex: 1;
      }

      .section-count {
        font-size: 10px;
        font-weight: 600;
        color: #505050;
        background: #1c1c1c;
        padding: 1px 8px;
        border-radius: 999px;
      }

      .section-count.has-issues {
        background: #ececec;
        color: #0c0c0c;
      }

      .section-body {
        display: none;
        background: #0c0c0c;
      }

      .section-body.open {
        display: block;
        padding: 12px 16px 16px;
      }

      .issue-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .issue-card {
        border: 1px solid #222222;
        border-radius: 8px;
        overflow: hidden;
      }

      .issue-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        padding: 12px 16px;
        border: none;
        background: transparent;
        color: #ececec;
        text-align: left;
        cursor: pointer;
      }

      .issue-card-title {
        font-size: 13px;
        font-weight: 500;
        line-height: 1.5;
        flex: 1;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 10px;
        height: 22px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .badge-safe,
      .badge-low,
      .badge-medium {
        background: #1c1c1c;
        color: #b0b0b0;
        border: 1px solid #2a2a2a;
      }

      .badge-high,
      .badge-critical {
        background: #ececec;
        color: #0c0c0c;
        border: 1px solid #ececec;
      }

      .issue-card-detail {
        display: none;
      }

      .issue-card-detail.open {
        display: block;
      }

      .issue-card-detail-inner {
        padding: 0 16px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        color: #b0b0b0;
      }

      .issue-detail-row {
        display: flex;
        gap: 8px;
      }

      .issue-detail-label {
        min-width: 64px;
        flex-shrink: 0;
        color: #787878;
        font-size: 12px;
        font-weight: 500;
      }

      .issue-detail-value {
        color: #ececec;
        font-size: 11.5px;
        font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
        word-break: break-word;
      }

      .issue-explanation {
        background: #141414;
        padding: 12px 14px;
        border-radius: 6px;
        border-left: 2px solid #333333;
        color: #787878;
        font-size: 12px;
        line-height: 1.6;
      }

      .no-issues {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #b0b0b0;
        font-size: 12px;
        font-weight: 500;
      }

      .btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 42px;
        background: #ececec;
        color: #0c0c0c;
        border: 1.5px solid #ececec;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }
    </style>
    <section class="panel">
      <div class="header">
        <img class="header-logo" src="${getLogoUrl()}" alt="Tribunal" />
        <div class="header-title">tribunal</div>
        <button class="minimize" type="button" aria-label="Minimize widget" data-no-drag="true">-</button>
      </div>
      <div class="body">
        <div class="status-note hidden" aria-live="polite"></div>
        <div class="content hidden"></div>
      </div>
      <div class="actions">
        <button class="btn-primary" type="button">Analyze Email</button>
      </div>
    </section>
  `;
}

function createBubbleMarkup() {
  return `
    <style>
      :host {
        all: initial;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .bubble {
        width: 64px;
        height: 64px;
        border-radius: 999px;
        background: #0c0c0c;
        border: 1px solid #222222;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.24);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .bubble.hidden {
        display: none;
      }

      .bubble-inner {
        width: 44px;
        height: 44px;
        border-radius: 999px;
        background: #ffffff;
        border: 1px solid #ebebeb;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .bubble img {
        width: 24px;
        height: 24px;
        object-fit: contain;
      }
    </style>
    <button class="bubble hidden" type="button" aria-label="Open Tribunal widget">
      <span class="bubble-inner">
        <img class="bubble-logo" src="${getLogoUrl()}" alt="Tribunal" />
      </span>
    </button>
  `;
}

export async function createFloatingWidget({ provider, onScan }) {
  if (document.getElementById(WIDGET_HOST_ID) || document.getElementById(WIDGET_BUBBLE_HOST_ID)) {
    return;
  }

  const storedState = await getWidgetState();

  const panelHost = document.createElement('div');
  panelHost.id = WIDGET_HOST_ID;
  panelHost.style.position = 'fixed';
  panelHost.style.right = `${getPanelPosition().right}px`;
  panelHost.style.bottom = `${getPanelPosition().bottom}px`;
  panelHost.style.maxWidth = 'calc(100vw - 24px)';
  panelHost.style.maxHeight = 'calc(100vh - 48px)';
  panelHost.style.zIndex = '2147483647';
  panelHost.style.pointerEvents = 'auto';

  const panelShadow = panelHost.attachShadow({ mode: 'open' });
  panelShadow.innerHTML = createPanelMarkup(provider);

  const bubbleHost = document.createElement('div');
  bubbleHost.id = WIDGET_BUBBLE_HOST_ID;
  bubbleHost.style.position = 'fixed';
  bubbleHost.style.right = '24px';
  bubbleHost.style.bottom = '24px';
  bubbleHost.style.zIndex = '2147483647';

  const bubbleShadow = bubbleHost.attachShadow({ mode: 'open' });
  bubbleShadow.innerHTML = createBubbleMarkup();

  (document.body || document.documentElement).appendChild(panelHost);
  (document.body || document.documentElement).appendChild(bubbleHost);

  const panel = panelShadow.querySelector('.panel');
  const minimizeButton = panelShadow.querySelector('.minimize');
  const scanButton = panelShadow.querySelector('.btn-primary');
  const content = panelShadow.querySelector('.content');
  const statusNote = panelShadow.querySelector('.status-note');
  const bubble = bubbleShadow.querySelector('.bubble');
  const logos = [...panelShadow.querySelectorAll('img'), ...bubbleShadow.querySelectorAll('img')];

  logos.forEach((logo) => {
    logo.addEventListener('error', () => {
      logo.src = getFallbackIconUrl();
    }, { once: true });
  });

  function applyMinimizedState(minimized) {
    panel.classList.toggle('hidden', minimized);
    bubble.classList.toggle('hidden', !minimized);
  }

  function clearStatusNote() {
    statusNote.innerHTML = '';
    statusNote.classList.add('hidden');
  }

  function showStatusNote(title, message) {
    statusNote.innerHTML = renderMessageCard(title, message);
    statusNote.classList.remove('hidden');
  }

  function getStatusTitleForError(message = '') {
    const normalized = String(message).toLowerCase();

    if (normalized.includes('log in')) {
      return 'Login required';
    }

    if (normalized.includes('open a gmail message') || normalized.includes('open an outlook message') || normalized.includes('open an email')) {
      return 'Open an email first';
    }

    return 'Unable to analyze';
  }

  function showResult(result) {
    clearStatusNote();
    content.innerHTML = renderResult(result);
    content.classList.remove('hidden');
    scanButton.textContent = 'Analyze Again';
    bindInteractiveSections();
  }

  function bindInteractiveSections() {
    panelShadow.querySelectorAll('.section-header').forEach((button) => {
      button.addEventListener('click', () => {
        const body = panelShadow.getElementById(`section-body-${button.dataset.section}`);
        const isOpen = body.classList.contains('open');
        body.classList.toggle('open');
        button.setAttribute('aria-expanded', String(!isOpen));
      });
    });

    panelShadow.querySelectorAll('.issue-card-header').forEach((button) => {
      button.addEventListener('click', () => {
        const detail = panelShadow.getElementById(`issue-detail-${button.dataset.issue}`);
        const isOpen = detail.classList.contains('open');
        detail.classList.toggle('open');
        button.setAttribute('aria-expanded', String(!isOpen));
      });
    });
  }

  applyMinimizedState(Boolean(storedState.minimized));

  minimizeButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    applyMinimizedState(true);
    await saveWidgetState({ minimized: true });
  });

  bubble.addEventListener('click', async () => {
    applyMinimizedState(false);
    await saveWidgetState({ minimized: false });
  });

  scanButton.addEventListener('click', async () => {
    scanButton.disabled = true;
    const idleLabel = scanButton.textContent;
    scanButton.textContent = 'Analyzing...';

    try {
      const result = await onScan();
      if (result?.ok === false) {
        throw new Error(result.error || 'Scan request failed.');
      }

      showResult(result?.result || result);
    } catch (error) {
      content.classList.add('hidden');
      showStatusNote(
        getStatusTitleForError(error.message),
        error.message || 'Unable to scan this message right now.'
      );
      scanButton.textContent = 'Analyze Email';
    } finally {
      scanButton.disabled = false;
      if (scanButton.textContent === 'Analyzing...') {
        scanButton.textContent = idleLabel;
      }
    }
  });
}

export function removeFloatingWidget() {
  document.getElementById(WIDGET_HOST_ID)?.remove();
  document.getElementById(WIDGET_BUBBLE_HOST_ID)?.remove();
}
