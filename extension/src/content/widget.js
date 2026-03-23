import { getWidgetState, saveWidgetState } from '../shared/storage.js';

export const WIDGET_HOST_ID = 'tribunal-floating-widget-host';

const ICONS = {
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`
};

function getProviderLabel(provider) {
  return provider === 'gmail' ? 'Gmail' : 'Outlook';
}

function getLogoUrl() {
  return chrome.runtime.getURL('logo.png');
}

function getFallbackIconUrl() {
  return chrome.runtime.getURL('icons/icon48.png');
}

function getClampedPosition(position, width = 320, height = 520) {
  if (!position || position.left == null || position.top == null) {
    return null;
  }

  const padding = 8;
  const maxLeft = Math.max(padding, window.innerWidth - width - padding);
  const maxTop = Math.max(padding, window.innerHeight - height - padding);

  return {
    left: Math.min(Math.max(position.left, padding), maxLeft),
    top: Math.min(Math.max(position.top, padding), maxTop)
  };
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

export function removeFloatingWidget() {
  document.getElementById(WIDGET_HOST_ID)?.remove();
}

export async function createFloatingWidget({ provider, onScan }) {
  // Content scripts can re-run on SPA navigation; keep a single widget instance mounted.
  if (document.getElementById(WIDGET_HOST_ID)) {
    return;
  }

  const storedState = await getWidgetState();
  const host = document.createElement('div');
  host.id = WIDGET_HOST_ID;
  host.style.position = 'fixed';
  host.style.zIndex = '2147483647';
  host.style.right = '24px';
  host.style.bottom = '24px';

  const clampedPosition = getClampedPosition(storedState.position);

  if (clampedPosition) {
    host.style.left = `${clampedPosition.left}px`;
    host.style.top = `${clampedPosition.top}px`;
    host.style.right = 'auto';
    host.style.bottom = 'auto';
  }

  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
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
        width: 320px;
        background: #0c0c0c;
        color: #ececec;
        border: 1px solid #222222;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
      }

      .panel.hidden,
      .content.hidden,
      .status-note.hidden {
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
        cursor: move;
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

      .minimize:hover {
        background: #1c1c1c;
        color: #ececec;
        border-color: #505050;
      }

      .body {
        padding: 20px;
      }

      .status-note {
        margin-bottom: 12px;
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
        letter-spacing: -0.01em;
      }

      .message-card-copy {
        margin-top: 6px;
        font-size: 12px;
        line-height: 1.6;
        color: #787878;
      }

      .content {
        margin-bottom: 16px;
      }

      .results-summary {
        text-align: center;
        padding: 4px 0 20px;
      }

      .results-threat-label {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.02em;
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

      .section-header:hover {
        background: rgba(255,255,255,0.04);
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
        min-width: 22px;
        text-align: center;
      }

      .section-count.has-issues {
        background: #ececec;
        color: #0c0c0c;
      }

      .section-body {
        overflow: hidden;
        max-height: 0;
        opacity: 0;
        transition: max-height 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms cubic-bezier(0.16, 1, 0.3, 1), padding 240ms cubic-bezier(0.16, 1, 0.3, 1);
        background: #0c0c0c;
      }

      .section-body.open {
        max-height: 720px;
        opacity: 1;
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

      .issue-card-header:hover {
        background: rgba(255,255,255,0.04);
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
        overflow: hidden;
        max-height: 0;
        opacity: 0;
        transition: max-height 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      .issue-card-detail.open {
        max-height: 420px;
        opacity: 1;
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
        gap: 8px;
        width: 100%;
        height: 42px;
        background: #ececec;
        color: #0c0c0c;
        border: 1.5px solid #ececec;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.01em;
        cursor: pointer;
        transition: all 120ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      .btn-primary:hover:not(:disabled) {
        background: transparent;
        color: #ececec;
      }

      .btn-primary:disabled {
        background: #1c1c1c;
        border-color: #222222;
        color: #505050;
        cursor: default;
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
    <section class="panel">
      <div class="header" data-drag-handle="panel">
        <img class="header-logo" src="${getLogoUrl()}" alt="Tribunal" />
        <div class="header-title">tribunal</div>
        <div class="header-copy">${getProviderLabel(provider)} protection active</div>
        <button class="minimize" type="button" aria-label="Minimize widget" data-no-drag="true">-</button>
      </div>
      <div class="body">
        <div class="status-note hidden" aria-live="polite"></div>
        <div class="content hidden"></div>
        <button class="btn-primary" type="button">Analyze Email</button>
      </div>
    </section>
    <button class="bubble hidden" type="button" aria-label="Open Tribunal widget">
      <span class="bubble-inner">
        <img class="bubble-logo" src="${getLogoUrl()}" alt="Tribunal" />
      </span>
    </button>
  `;

  (document.body || document.documentElement).appendChild(host);

  const panel = shadow.querySelector('.panel');
  const bubble = shadow.querySelector('.bubble');
  const minimizeButton = shadow.querySelector('.minimize');
  const scanButton = shadow.querySelector('.btn-primary');
  const content = shadow.querySelector('.content');
  const statusNote = shadow.querySelector('.status-note');
  const dragHandle = shadow.querySelector('[data-drag-handle="panel"]');
  const logos = shadow.querySelectorAll('img');

  logos.forEach((logo) => {
    logo.addEventListener('error', () => {
      logo.src = getFallbackIconUrl();
    }, { once: true });
  });

  window.addEventListener('resize', async () => {
    const rect = host.getBoundingClientRect();
    const nextPosition = getClampedPosition({ left: rect.left, top: rect.top }, rect.width || 320, rect.height || 520);

    if (!nextPosition) {
      return;
    }

    host.style.left = `${nextPosition.left}px`;
    host.style.top = `${nextPosition.top}px`;
    host.style.right = 'auto';
    host.style.bottom = 'auto';
    await saveWidgetState({ position: nextPosition });
  });

  function applyMinimizedState(minimized) {
    // The minimized bubble remains as the single page affordance when the panel is collapsed.
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

  function showResult(result) {
    clearStatusNote();
    content.innerHTML = renderResult(result);
    content.classList.remove('hidden');
    scanButton.textContent = 'Analyze Again';
  }

  // Re-bind section toggles after each result render because the content is replaced wholesale.
  function bindInteractiveSections() {
    shadow.querySelectorAll('.section-header').forEach((button) => {
      button.addEventListener('click', () => {
        const body = shadow.getElementById(`section-body-${button.dataset.section}`);
        const isOpen = body.classList.contains('open');
        body.classList.toggle('open');
        button.setAttribute('aria-expanded', String(!isOpen));
      });
    });

    shadow.querySelectorAll('.issue-card-header').forEach((button) => {
      button.addEventListener('click', () => {
        const detail = shadow.getElementById(`issue-detail-${button.dataset.issue}`);
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
      // `onScan` is supplied by the provider entry file and returns a mock or backend result.
      const result = await onScan();
      if (result?.ok === false) {
        throw new Error(result.error || 'Scan request failed.');
      }

      showResult(result?.result || result);
      bindInteractiveSections();
    } catch (error) {
      content.classList.add('hidden');
      showStatusNote('Open an email first', error.message || 'Unable to scan this message right now.');
      scanButton.textContent = 'Analyze Email';
    } finally {
      scanButton.disabled = false;
      if (scanButton.textContent === 'Analyzing...') {
        scanButton.textContent = idleLabel;
      }
    }
  });

  attachDragBehavior({
    target: host,
    handles: [dragHandle, bubble],
    onMove: async (position) => {
      await saveWidgetState({ position });
    }
  });
}

function attachDragBehavior({ target, handles, onMove }) {
  let activePointerId = null;
  let startPointerX = 0;
  let startPointerY = 0;
  let startLeft = 0;
  let startTop = 0;
  let moved = false;

  function onPointerMove(event) {
    if (event.pointerId !== activePointerId) {
      return;
    }

    const nextLeft = Math.max(8, startLeft + (event.clientX - startPointerX));
    const nextTop = Math.max(8, startTop + (event.clientY - startPointerY));
    target.style.left = `${nextLeft}px`;
    target.style.top = `${nextTop}px`;
    target.style.right = 'auto';
    target.style.bottom = 'auto';
    moved = true;
  }

  async function onPointerUp(event) {
    if (event.pointerId !== activePointerId) {
      return;
    }

    const rect = target.getBoundingClientRect();
    activePointerId = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);

    if (moved) {
      await onMove({ left: Math.round(rect.left), top: Math.round(rect.top) });
    }
  }

  handles.forEach((handle) => {
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) {
        return;
      }

      // Do not start dragging when the user is interacting with a control inside the header.
      if (event.target instanceof Element && event.target.closest('[data-no-drag="true"], button, a, input, textarea, select')) {
        return;
      }

      const rect = target.getBoundingClientRect();
      activePointerId = event.pointerId;
      startPointerX = event.clientX;
      startPointerY = event.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      moved = false;

      handle.setPointerCapture(event.pointerId);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    });
  });
}
