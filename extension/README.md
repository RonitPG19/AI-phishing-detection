# Tribunal Extension

This module is in good shape now, and this README reflects the current extension behavior (Gmail + Outlook, auth, API scan, history, debug, and Firefox dev flow).

## What It Does

- Injects content scripts into Gmail and Outlook web apps.
- Extracts current email data from live DOM (subject, sender, recipients, body, links, metadata).
- Normalizes payload and sends scan requests through background service worker.
- Shows scan results in:
  - popup `Scan` tab
  - in-page floating widget (`Analyze Email`)
- Stores local scan history and latest debug payload/result in `chrome.storage.local`.
- Hydrates history from backend reports endpoint when logged in.
- Supports Firebase + Flask auth flow in popup.

## Current Stack

- Manifest V3
- Vanilla JavaScript
- Vite + `@crxjs/vite-plugin`
- Firefox packaging helper script

## Project Structure

```text
extension/
  public/
    icons/
    logo.png
  scripts/
    prepare-firefox-build.mjs
  src/
    background/
      api-client.js
      service-worker.js
    content/
      extractors/
        gmail-extractor.js
        normalizer.js
        outlook-extractor.js
      gmail.js
      outlook.js
      widget.js
    popup/
      popup.html
      popup.css
      popup.js
    shared/
      auth-client.js
      constants.js
      mock-scan-result.js
      storage.js
  manifest.json
  package.json
```

## Prerequisites

- Node.js 20+
- npm

## Install

```bash
cd extension
npm install
```

## Build Commands

```bash
# Chromium-based unpacked build
npm run build

# Firefox temporary add-on build
npm run build:firefox
```

- Chromium output: `extension/dist`
- Firefox output: `extension/dist-firefox`

## Load Extension

### Chromium / Thorium / Brave

1. Open extensions page.
2. Enable Developer mode.
3. Load unpacked from `extension/dist`.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on`.
3. Select `extension/dist-firefox/manifest.json`.

## Runtime Configuration

Defaults are in `src/shared/constants.js`:

- scan API endpoint: `http://127.0.0.1:8080/api/phishing/scan`
- Flask auth base URL: `http://127.0.0.1:5001`

Expected backend routes used by extension:

- `POST /api/phishing/scan`
- `GET /api/phishing/reports?limit=50` (history hydration)
- Flask auth/user routes used by `src/shared/auth-client.js`

## Data Stored in `chrome.storage.local`

- `tribunal_api_config`
- `tribunal_auth_config`
- `tribunal_auth_session`
- `tribunal_history`
- `tribunal_widget_state`
- `tribunal_widget_preferences`
- `tribunal_last_scan_debug`

## Scan Flow

1. Popup or widget triggers scan.
2. Content script extracts current mail and normalizes payload.
3. Background service worker receives `SCAN_EMAIL`.
4. Background calls API client:
  - live backend request when enabled
  - mock result fallback if API disabled/no endpoint
5. Result is returned to UI and stored in local history/debug.

## Firefox Dev Stability Notes

The extension now includes reconnect hardening:

- popup sends background heartbeat before scan
- popup pings content script before scan
- auto reinjection via `chrome.scripting.executeScript` when receiver is missing
- content watchdog cleans up stale widget context after extension reload
- clearer recovery message and refresh fallback UX

During development, after reloading the extension, refresh Gmail/Outlook tab once for the cleanest run.

## Debugging

Latest payload/result:

```js
chrome.storage.local.get('tribunal_last_scan_debug').then(console.log)
```

History:

```js
chrome.storage.local.get('tribunal_history').then(console.log)
```

## Known Constraints

- Extraction is DOM-based, so provider UI changes can break selectors.
- Header quality is best-effort from DOM; not equivalent to raw RFC headers.
- Very large newsletters with many redirects can increase scan time.
- When sender email cannot be normalized, API scan is intentionally blocked with user-facing error.

## Recent Fixes Included

- Outlook `From` cleanup and normalization improvements.
- Popup nav state consistency after login/logout.
- History hydration from backend reports endpoint.
- Firefox reconnect/self-heal for `Receiving end does not exist`.
- Floating widget scroll/action layout fixes for long findings.
