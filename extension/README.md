# Extension

Browser extension for phishing scanning on supported webmail pages.

## Purpose

This extension currently targets Gmail first and Outlook second.

The current implementation does four things:

1. Detects when the user is on a supported mail page
2. Extracts visible email data from an opened message
3. Normalizes the extracted data into a single internal payload shape
4. Sends that payload through the background layer and returns a mock scan result when no real API is configured

## Tech Stack

- Manifest V3
- Vite
- CRXJS Vite plugin
- Vanilla JavaScript

## Prerequisites

- Node.js 20+
- npm

## Install

```bash
cd extension
npm install
```

## Build

### Chromium / Thorium build

```bash
npm run build
```

The unpacked Chromium-compatible build is generated in `extension/dist`.

### Firefox build

```bash
npm run build:firefox
```

The Firefox-compatible temporary add-on build is generated in `extension/dist-firefox`.

## Run In Browser

### Thorium / Chromium-based browsers

1. Open the extensions page.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select `extension/dist`.

After code changes:

1. Run `npm run build`
2. Reload the unpacked extension
3. Refresh the Gmail / Outlook tab

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on`.
3. Select `extension/dist-firefox/manifest.json`.

After code changes:

1. Run `npm run build:firefox`
2. Reload the temporary add-on
3. Refresh the Gmail / Outlook tab

## Folder Structure

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
      gmail.js
      outlook.js
      widget.js
    popup/
      popup.html
      popup.css
      popup.js
    shared/
      constants.js
      mock-scan-result.js
      storage.js
      utils.js
  manifest.json
  package.json
  vite.config.js
  vite.preview.js
```

## Folder Responsibilities

### `public/`

Static assets copied into the final extension build.

- `icons/`: extension icons referenced by `manifest.json`
- `logo.png`: Tribunal logo used by popup and in-page widget

### `scripts/`

Build helpers.

- `prepare-firefox-build.mjs`: patches the generated manifest into a Firefox-compatible temporary add-on build

### `src/background/`

Background runtime code.

- `service-worker.js`: receives scan requests from content scripts and sends responses back
- `api-client.js`: owns the network call boundary; falls back to mock results when no real API is configured

Use this folder when work belongs to background execution, request routing, token handling, or backend communication.

### `src/content/`

Code injected into Gmail / Outlook pages.

- `gmail.js`: Gmail entry point
- `outlook.js`: Outlook entry point
- `widget.js`: floating in-page Tribunal UI
- `extractors/`: provider-specific DOM extraction logic

Use this folder when work depends on the live email page DOM.

### `src/content/extractors/`

Provider-specific parsing logic.

- `gmail-extractor.js`: Gmail DOM selectors and Gmail-specific cleanup
- `outlook-extractor.js`: Outlook DOM selectors and Outlook-specific cleanup
- `normalizer.js`: converts extracted provider data into one internal payload shape

This folder should stay provider-aware. If a selector changes because Gmail or Outlook changes its DOM, the fix should usually live here.

### `src/popup/`

Browser action popup UI.

- `popup.html`: popup shell
- `popup.css`: popup styling
- `popup.js`: popup state, navigation, and debug/settings/history rendering

Use this folder for user-facing extension controls, not for DOM scraping.

### `src/shared/`

Cross-cutting shared utilities.

- `constants.js`: shared message types and provider constants
- `mock-scan-result.js`: mock scan output used before the real API is connected
- `storage.js`: shared `chrome.storage.local` helpers
- `utils.js`: generic helpers

Use this folder for code that is shared across popup, content scripts, and background.

## Current Flow

Current scan flow is:

1. Content script detects provider page
2. User opens a message
3. User clicks `Analyze Email` in the floating widget
4. Provider extractor reads the opened email from the DOM
5. Extracted data is normalized
6. Normalized payload is sent to the background service worker
7. Background calls the mock/real API layer
8. Result is shown in the widget
9. Last payload/result pair is stored in `chrome.storage.local` for debugging

## Debugging

The last captured payload/result pair is stored under:

- `tribunal_last_scan_debug`

You can inspect it through extension storage or DevTools console:

```js
chrome.storage.local.get('tribunal_last_scan_debug').then(console.log)
```

## Current Internal Payload Shape

The extension currently produces an internal object with fields such as:

- `subject`
- `from`
- `bodyHtml`
- `bodyText`
- `headers`
- `links`
- `attachments`
- `metadata`

This internal shape can be trimmed later to match the exact backend contract.

## Implemented

- Extension restructured into `src/` and `public/`
- Manifest V3 build flow via Vite + CRXJS
- Gmail page detection and Gmail message extraction
- Initial Outlook page detection and Outlook extraction pass
- Floating in-page widget
- Widget position/minimize persistence
- Popup settings toggle for floating widget enable/disable
- Background request pipeline
- Mock scan result generation
- Storage-backed debug payload/result capture
- Thorium / Chromium-based browser testing
- Firefox-specific build output generation

## Remaining

- Finalize the exact backend request payload contract
- Replace mock scanning with the real API endpoint
- Implement authentication if backend requests must be protected
- Decide whether provider APIs are needed for reliable header retrieval
- Refine and validate Outlook extraction on real Outlook mailboxes
- Validate the Firefox build on real Gmail / Outlook sessions
- Complete final popup/widget UX parity checks

## Current Limitations

- Gmail extraction currently works on opened messages, but subject detection still needs refinement for some digest / newsletter emails. In some cases a story title from the body can be captured instead of the actual Gmail thread subject.
- Header extraction is not reliable through DOM scraping alone. `headers` will currently be empty or partial until provider API integration is added.
- `bodyHtml` is intentionally retained for downstream scanning, but some emails still produce large / noisy HTML payloads.
- Link extraction currently captures visible message links, including tracking or newsletter links when they are part of the email body.
- Outlook extraction is only a first pass and has not yet been validated against enough real Outlook message layouts.
- Popup-level debug access still needs one final UX pass to make inspection more obvious.
- Firefox compatibility now has a dedicated build path, but runtime validation is still pending.

## Current Testing Status

- Tested on Thorium (Chromium-based)
- Firefox compatibility build prepared, runtime validation pending
- Outlook validation is still pending
