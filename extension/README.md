# Tribunal Browser Extension

Tribunal is a Manifest V3 browser extension for scanning suspicious emails from Gmail and Outlook. It can scan the currently open mail tab through DOM extraction, and it also supports OAuth-backed mailbox API access through the Spring Boot backend.

## What The Extension Does

- Shows a popup UI with Scan, History, Profile, and Settings tabs.
- Injects content scripts into Gmail and Outlook web pages.
- Extracts the currently opened email from the page for current-tab scanning.
- Calls the Spring Boot phishing scanner API with an authenticated JWT.
- Displays section-wise scan findings for headers, subject, body, links, and attachments metadata.
- Stores local scan history in `chrome.storage.local`.
- Hydrates authenticated scan history from the backend.
- Supports Gmail OAuth through the Spring Boot backend.
- Supports mailbox API message listing/fetching when OAuth tokens are available.

## Project Structure

```text
extension/
  public/
    logo.png
    oauth2-redirect.html
    oauth2-redirect.js
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
      mailbox-client.js
      mock-scan-result.js
      storage.js
  manifest.json
  package.json
```

## Local Services

The extension expects these local services:

```text
Spring Boot backend: http://127.0.0.1:8080
Flask auth backend:  http://127.0.0.1:5001
```

Start Spring Boot:

```powershell
cd "D:\8th sem\AI-phishing-detection\backend\scanner-app"
.\mvnw.cmd --% -Dmaven.test.skip=true spring-boot:run
```

Start Flask auth:

```powershell
cd "D:\8th sem\AI-phishing-detection\backend\flask-auth"
python app.py
```

## Install And Build

```powershell
cd "D:\8th sem\AI-phishing-detection\extension"
npm install
npm run build
```

The Chrome/Chromium build is generated in:

```text
extension/dist
```

For Firefox temporary add-on build:

```powershell
npm run build:firefox
```

The Firefox build is generated in:

```text
extension/dist-firefox
```

## Loading In Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `extension/dist`.
5. After every source change, run `npm run build` and reload the unpacked extension.

## Important URLs

Defaults are defined in `src/shared/constants.js`.

Scan API:

```text
POST http://127.0.0.1:8080/api/phishing/scan
```

Spring OAuth start URL:

```text
GET http://127.0.0.1:8080/oauth2/authorization/google
```

OAuth redirect page inside extension:

```text
chrome-extension://<extension-id>/oauth2-redirect.html#token=<jwt>&tokenType=Bearer
```

Mailbox API routes:

```text
GET http://127.0.0.1:8080/api/mail/connections
GET http://127.0.0.1:8080/api/mail/messages?provider=google&limit=10
GET http://127.0.0.1:8080/api/mail/messages/{messageId}?provider=google
GET http://127.0.0.1:8080/api/mail/messages/{messageId}/attachments/{attachmentId}?provider=google
```

Flask auth routes used by email/password login:

```text
POST http://127.0.0.1:5001/api/auth/login
POST http://127.0.0.1:5001/api/auth/logout
GET  http://127.0.0.1:5001/api/user/profile
```

## Auth Flow

OAuth is initiated by the extension, but authentication and token completion happen through Spring Boot.

1. User clicks Continue with Gmail in the extension.
2. Extension opens:

```text
http://127.0.0.1:8080/oauth2/authorization/google
```

3. Spring Boot redirects to Google OAuth.
4. Google redirects back to Spring Boot:

```text
http://localhost:8080/login/oauth2/code/google
```

5. Spring Boot stores provider tokens for mailbox API access.
6. Spring Boot generates the application JWT.
7. Spring Boot redirects to the extension redirect page:

```text
chrome-extension://<extension-id>/oauth2-redirect.html#token=<jwt>&tokenType=Bearer
```

8. `public/oauth2-redirect.js` decodes the JWT claims and stores the auth session in `chrome.storage.local`.
9. Later scan, history, and mailbox requests include:

```http
Authorization: Bearer <jwt>
```

## Current-Tab DOM Scan Flow

This is the main flow when the user scans the email currently open in Gmail or Outlook.

1. User opens an email in Gmail or Outlook.
2. User clicks Scan Current Tab in the popup.
3. Popup sends `REQUEST_ACTIVE_SCAN` to the active tab content script.
4. `src/content/gmail.js` or `src/content/outlook.js` extracts data from the page DOM.
5. Extracted data is normalized.
6. Popup/background sends `SCAN_EMAIL` to the service worker.
7. `src/background/service-worker.js` calls `scanEmailWithApi()` in `src/background/api-client.js`.
8. `api-client.js` sends:

```http
POST http://127.0.0.1:8080/api/phishing/scan
Authorization: Bearer <jwt>
Content-Type: application/json
```

9. Spring Boot scans the email and returns the result.
10. Extension renders the result and stores local history/debug data.

Current-tab scan payload sent to `/api/phishing/scan` contains:

```json
{
  "subject": "...",
  "from": "...",
  "bodyHtml": "...",
  "bodyText": "...",
  "headers": {
    "From": ["..."],
    "To": ["..."],
    "Date": ["..."]
  }
}
```

## Mailbox API Extraction Flow

This flow does not extract from the DOM. It uses the backend mailbox APIs after OAuth.

1. User completes Gmail OAuth.
2. Backend stores Google OAuth access/refresh token.
3. Extension calls:

```http
GET http://127.0.0.1:8080/api/mail/messages?provider=google&limit=10
Authorization: Bearer <jwt>
```

4. Spring Boot calls Gmail API using the stored provider token.
5. Backend returns message summaries to the extension.
6. User selects one message.
7. Extension calls:

```http
GET http://127.0.0.1:8080/api/mail/messages/{messageId}?provider=google
Authorization: Bearer <jwt>
```

8. Spring Boot fetches full message details from Gmail API.
9. Extension converts the returned mail object into a scan payload.
10. Extension sends the converted payload to:

```http
POST http://127.0.0.1:8080/api/phishing/scan
Authorization: Bearer <jwt>
```

So the API extraction path is:

```text
Extension -> Spring Boot /api/mail/messages -> Gmail API -> Spring Boot -> Extension -> /api/phishing/scan
```

## Attachment Handling

Current behavior:

- Attachment metadata is included in mailbox message responses.
- Actual attachment file bytes/content are not sent to the phishing scan route.

What is included now:

```text
filename
mime type
size
attachment id / metadata
```

What is not included now:

```text
PDF bytes
DOCX content
image content
actual attachment body
```

There is a backend download route available:

```text
GET /api/mail/messages/{messageId}/attachments/{attachmentId}?provider=google
```

But the extension scan flow does not currently call this route before `/api/phishing/scan`.

## Stored Data

The extension stores state in `chrome.storage.local`.

```text
tribunal_api_config
tribunal_auth_config
tribunal_auth_session
tribunal_history
tribunal_widget_state
tribunal_widget_preferences
tribunal_last_scan_debug
```

Auth session contains the backend JWT and basic user profile claims.

## History Flow

Local history:

- Stored in `tribunal_history`.
- Updated after scans.

Backend history:

- Fetched from Spring Boot after login.
- History list comes from `/api/phishing/history`.
- Full detail is loaded with `/api/phishing/reports/{reportId}` when a history item is opened.

## Debug Tab

The Debug tab is currently hidden in the popup UI for project-report screenshots.

The debug storage still exists internally:

```js
chrome.storage.local.get('tribunal_last_scan_debug').then(console.log)
```

## Troubleshooting

### OAuth opens `/login?error`

Expected URL when clicking Continue with Gmail:

```text
http://127.0.0.1:8080/oauth2/authorization/google
```

If the browser shows:

```text
http://127.0.0.1:8080/login?error
```

then OAuth failed in Spring Boot. Common causes:

- Old extension build is loaded.
- Google OAuth redirect URI is missing.
- `app.oauth2.success-redirect-uri` uses the wrong extension id.
- Backend was not restarted after config changes.

### `Firebase: Error (auth/invalid-credential)`

This comes from Firebase email/password login, not Spring OAuth.

Use Continue with Gmail for OAuth login.

Email/password login only works when:

- User signed up through Firebase email/password.
- User verified their email.
- Email/password provider is enabled in Firebase.

### Spring Boot shows `Client id of registration 'outlook' must not be empty`

Outlook OAuth config exists but `OUTLOOK_CLIENT_ID` is empty.

Fix by either commenting out Outlook config or setting:

```powershell
$env:OUTLOOK_CLIENT_ID="your-client-id"
$env:OUTLOOK_CLIENT_SECRET="your-client-secret"
```

### Maven command fails in PowerShell

Use the PowerShell-safe form:

```powershell
.\mvnw.cmd --% -Dmaven.test.skip=true spring-boot:run
```

In plain CMD, this is okay:

```cmd
mvnw.cmd -Dmaven.test.skip=true spring-boot:run
```

## Key Files

```text
src/shared/constants.js            API base URLs and defaults
src/shared/storage.js              chrome.storage.local helpers
src/shared/auth-client.js          Firebase + Flask auth flow
src/shared/mailbox-client.js       Spring OAuth/mailbox API calls
src/background/service-worker.js   runtime message handling
src/background/api-client.js       calls /api/phishing/scan
src/content/gmail.js               Gmail current-tab extraction entry
src/content/outlook.js             Outlook current-tab extraction entry
src/popup/popup.js                 popup UI, navigation, scan/history/profile
public/oauth2-redirect.js          stores Spring Boot JWT after OAuth redirect
```
