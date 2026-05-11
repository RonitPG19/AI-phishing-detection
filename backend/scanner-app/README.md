# Phishing Scanner — Backend (scanner-app)

> **Spring Boot 4 · Java 21 · Firestore · Gemini AI · Multi-layered phishing detection**

The scanner-app backend is the core analysis engine of the Phishing Scanner platform. It receives email metadata (or standalone URLs) from the browser extension, runs them through **eight independent detection stages**, produces a categorized risk report with a 0–100 score, and persists everything to Firestore with built-in caching, scan history, and user-flagging workflows.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Detection Pipeline](#detection-pipeline)
  - [1. URL Extraction](#1-url-extraction)
  - [2. Redirect Chain Resolution](#2-redirect-chain-resolution)
  - [3. Email Header Inspection](#3-email-header-inspection)
  - [4. Threat Intelligence Blacklist](#4-threat-intelligence-blacklist)
  - [5. Google Safe Browsing](#5-google-safe-browsing)
  - [6. Homograph / IDN Attack Detection](#6-homograph--idn-attack-detection)
  - [7. Domain Age (WHOIS)](#7-domain-age-whois)
  - [8. Typosquatting Detection](#8-typosquatting-detection)
  - [9. SSL Certificate Inspection](#9-ssl-certificate-inspection)
  - [10. AI Analysis (Gemini)](#10-ai-analysis-gemini)
- [Risk Scoring Algorithm](#risk-scoring-algorithm)
- [Scan Modes](#scan-modes)
- [API Reference](#api-reference)
- [Firestore Data Model](#firestore-data-model)
- [Security](#security)
- [Caching & Fingerprinting](#caching--fingerprinting)
- [Scan History](#scan-history)
- [Flagging System](#flagging-system)
- [Configuration Reference](#configuration-reference)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Contributing Guidelines](#contributing-guidelines)

---

## Architecture Overview

```
Browser Extension
        │
        ▼
┌──────────────────────────────────────────────────────┐
│  PhishingScannerController  (REST API layer)         │
│  PhishingHistoryController                           │
│  PhishingFlagController                              │
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│  ScanOrchestrationService                            │
│  ┌─ ScanFingerprintService  (SHA-256 cache key)      │
│  ├─ FirestoreScanCacheService  (cache lookup/store)  │
│  ├─ PhishingScannerService  ◄── CORE DETECTION ──►   │
│  │   ├─ RedirectChainResolver                        │
│  │   ├─ ThreatIntelService (OpenPhish/PhishTank/…)   │
│  │   ├─ GeminiEmailAnalyzer (AI)                     │
│  │   └─ WhitelistManager (Tranco/Umbrella top-1M)    │
│  ├─ FirestoreReportService  (persist full report)    │
│  ├─ FirestoreScanHistoryService (per-user history)   │
│  └─ ScanResponseMapper  (internal → API DTOs)        │
└──────────────────────────────────────────────────────┘
             │
             ▼
        Google Firestore
```

The key design principle is **orchestration vs. detection separation**. `ScanOrchestrationService` handles cache-check → scan → persist → history, while `PhishingScannerService` is a pure detection engine with zero persistence awareness.

---

## Project Structure

```
src/main/java/com/phishing/scanner_app/
├── config/
│   ├── CorsConfig.java            # CORS policy for browser extension
│   ├── FirebaseConfig.java        # Conditional Firebase/Firestore init
│   ├── JacksonConfig.java         # Jackson ObjectMapper customization
│   └── SecurityConfig.java        # Spring Security filter chain + role rules
├── controller/
│   ├── PhishingScannerController   # POST /scan, GET /reports, GET /reports/{id}
│   ├── PhishingHistoryController   # GET/DELETE /history
│   ├── PhishingFlagController      # POST flags on reports/findings, GET /flags/mine
│   ├── AdminController             # Admin-only endpoints
│   └── UserController              # User profile endpoint
├── dto/
│   ├── EmailRequest                # Inbound scan request (email body + links)
│   ├── ScanResponse                # Outbound scan result
│   ├── CachedScanPayload           # Serializable cache entry
│   ├── LinkScanReport / Request    # Link-only scan DTOs
│   ├── CreateFlagRequest           # Flag creation payload
│   ├── FlagResponse                # Flag result
│   ├── HistoryItemResponse         # History entry
│   ├── CursorPageResponse          # Cursor-based pagination wrapper
│   └── Scan*Response               # Sections, categories, findings DTOs
├── exception/
│   ├── GlobalExceptionHandler      # @RestControllerAdvice — unified error responses
│   ├── AccessDeniedException       # 403
│   ├── ConflictException           # 409
│   ├── ResourceNotFoundException   # 404
│   └── PersistenceUnavailableException  # 503
├── model/
│   ├── EmailScanReport             # Internal scan report record
│   ├── CategorizedFindings         # Header / Subject / Body / Links buckets
│   ├── CategoryResult              # Findings + score breakdown per category
│   ├── RiskFinding                 # Single finding (target, desc, severity, score)
│   ├── Severity                    # Enum: LOW(5), MEDIUM(15), HIGH(25)
│   ├── RiskScoreResult             # Overall score + breakdown map
│   ├── HeaderInspectionResult      # SPF/DKIM/DMARC/display-name/reply-to flags
│   └── EmailContent                # Aggregates HTML + plain-text body
├── security/
│   ├── JwtAuthFilter               # OncePerRequestFilter — extracts Bearer token
│   └── JwtUtil                     # HMAC-SHA JWT validation + claims extraction
├── service/
│   ├── PhishingScannerService      # ★ Core detection engine (1,367 lines)
│   ├── ScanOrchestrationService    # Cache → scan → persist → history flow
│   ├── GeminiEmailAnalyzer         # Gemini API integration with retry + sanitization
│   ├── ThreatIntelService          # Multi-feed blacklist with disk persistence
│   ├── FirestoreReportService      # Firestore CRUD for scan reports
│   ├── FirestoreScanCacheService   # Firestore-backed scan result cache
│   ├── FirestoreScanHistoryService # Per-user scan history with soft-delete
│   ├── FirestoreScanFlagService    # User flagging system with dedup
│   ├── ScanFingerprintService      # Deterministic SHA-256 cache key generation
│   └── ScanResponseMapper          # Internal models → API DTOs
└── util/
    ├── RedirectChainResolver       # HTTP redirect chain follower (up to 10 hops)
    └── WhitelistManager            # Top-1M domain whitelist loader

src/main/resources/
├── application.properties.example  # Template config — copy to application.properties
├── top-1m-Tranco.csv               # Tranco top-1M domain list (~22 MB)
└── top-1m-umbrella.csv             # Cisco Umbrella top-1M list (~33 MB)

src/test/java/com/phishing/scanner_app/
├── controller/
│   └── PhishingScannerControllerSecurityTest  # Security rule tests
└── service/
    ├── FirestoreScanCacheServiceTest
    ├── FirestoreScanFlagServiceTest
    ├── FirestoreScanHistoryServiceTest
    └── ScanResponseMapperTest
```

---

## Detection Pipeline

Each scan runs through the following stages sequentially. Every stage produces `RiskFinding` objects that contribute to the final score.

### 1. URL Extraction

**File:** `PhishingScannerService.extractUrlsFromContent()`

- **HTML bodies** → Jsoup parses `<a href="...">` elements
- **Plain-text bodies** → Regex extraction of `http(s)://` URLs
- **Explicit links** → Merged from the `links[]` field in `EmailRequest`

### 2. Redirect Chain Resolution

**File:** `RedirectChainResolver.java`

Follows HTTP 3xx redirects hop-by-hop (max 10 hops, 5s timeout per hop) using HEAD requests with redirects disabled. Also handles:

| Pattern                                   | Technique                         |
| ----------------------------------------- | --------------------------------- |
| Google redirects (`google.com/url?q=...`) | Query-parameter extraction        |
| Firebase Dynamic Links (`*.page.link`)    | `link` param extraction           |
| Salesforce click tracking                 | `redirect`/`url` param extraction |
| Microsoft Safe Links                      | `url` param extraction            |

**Findings produced:**

- `MEDIUM` — Chain ≥ 3 hops
- `LOW` — Cross-domain redirect (root domain changes)
- `LOW` — Known URL shortener detected (bit.ly, t.co, etc.)

Multi-threaded: up to **8 parallel threads** for redirect resolution.

### 3. Email Header Inspection

**File:** `PhishingScannerService.inspectAuthenticationHeaders()`

Only runs when the request has body content (full email scan). Checks:

| Check                      | Severity | Condition                                                           |
| -------------------------- | -------- | ------------------------------------------------------------------- |
| SPF fail                   | MEDIUM   | `Authentication-Results` contains `spf=fail`                        |
| DKIM fail                  | MEDIUM   | `Authentication-Results` contains `dkim=fail`                       |
| DMARC fail                 | MEDIUM   | `Authentication-Results` contains `dmarc=fail`                      |
| Return-Path mismatch       | MEDIUM   | Root domain of `Return-Path` ≠ `From`                               |
| Display name impersonation | MEDIUM   | Display name contains a known brand but sender domain doesn't match |
| Reply-To mismatch          | LOW      | Root domain of `Reply-To` ≠ `From`                                  |

### 4. Threat Intelligence Blacklist

**File:** `ThreatIntelService.java`

Maintains a **local blacklist** aggregated from multiple threat feeds:

| Feed      | Default URL                                       |
| --------- | ------------------------------------------------- |
| OpenPhish | `https://openphish.com/feed.txt`                  |
| PhishTank | `http://data.phishtank.com/data/online-valid.csv` |
| URLhaus   | Configurable                                      |

**How it works:**

1. On startup, loads cached blacklist from `data/threat-intel/blacklist.csv`
2. Checks feed age via `blacklist-metadata.properties`
3. If stale (default: 24h), refreshes from all feeds, merges, and atomically replaces the CSV
4. Scheduled refresh check every hour (`@Scheduled`)
5. URL normalization (lowercase host, strip fragments) before comparison
6. Finding: `HIGH` severity for any blacklisted URL match

### 5. Google Safe Browsing

**File:** `PhishingScannerService.checkGoogleSafeBrowsing()`

Calls the [Google Safe Browsing Lookup API v4](https://developers.google.com/safe-browsing/v4/lookup-api) with all discovered URLs in a single batch request. Checks for `MALWARE` and `SOCIAL_ENGINEERING` threat types.

- Finding: `HIGH` severity for each matched URL + threat type

### 6. Homograph / IDN Attack Detection

**File:** `PhishingScannerService.inspectHomographDomains()`

Two-layer check:

1. **Unicode/IDN detection** — Flags domains containing non-ASCII characters (`HIGH`)
2. **Digit-letter substitution** — Converts domains through a homoglyph map (`0→o`, `1→l`, `5→s`, `8→b`, etc.) and checks if the "skeleton" matches any trusted domain or known brand. Finding: `HIGH`

**Brand domain map** covers: PayPal, eBay, Amazon, Google, Microsoft, Apple, Facebook, Twitter, LinkedIn, Instagram, Chase, Wells Fargo, Citi, IRS, FedEx, UPS, DHL.

### 7. Domain Age (WHOIS)

**File:** `PhishingScannerService.inspectDomainAges()`

Performs live WHOIS lookups via raw TCP socket connections (port 43):

1. Queries `whois.iana.org` to find the registrar's WHOIS server
2. Follows the referral to the authoritative WHOIS server
3. Parses the creation date from multiple date formats (ISO 8601, dd-MMM-yyyy, etc.)
4. Finding: `MEDIUM` if domain is < 60 days old

**Performance:** Multi-threaded (up to **6 parallel WHOIS threads**), results cached in a `ConcurrentHashMap`.

### 8. Typosquatting Detection

**File:** `PhishingScannerService.inspectTyposquatting()`

Computes **Levenshtein edit distance** between each extracted domain and the trusted domain set (Tranco + Umbrella top-1M lists, capped at 10,000 per file).

- Finding: `MEDIUM` if edit distance ≤ 3 and the domain isn't already trusted

### 9. SSL Certificate Inspection

**File:** `PhishingScannerService.inspectSslCertificates()`

For each HTTPS URL, opens a TLS connection and inspects the X.509 certificate:

| Check                      | Severity | Condition                       |
| -------------------------- | -------- | ------------------------------- |
| Very new certificate       | LOW      | Issued < 15 days ago            |
| Let's Encrypt + new domain | MEDIUM   | LE cert on domain < 30 days old |
| SSL handshake failure      | HIGH     | `SSLHandshakeException`         |
| Unresolvable host          | LOW      | `UnknownHostException`          |

### 10. AI Analysis (Gemini)

**File:** `GeminiEmailAnalyzer.java`

Only runs when the request has body content. Sends the email subject + sender + body to **Google Gemini** (`gemini-3.1-flash-lite-preview`) with a structured system prompt.

**Categories analyzed:**

1. Urgency/pressure language
2. Credential harvesting attempts
3. Brand impersonation
4. Authority impersonation
5. Suspicious calls-to-action
6. Grammar/spelling anomalies
7. Emotional manipulation
8. Mismatched context

**Security hardening:**

- Email body wrapped in `<<<EMAIL_BODY_START>>>` / `<<<EMAIL_BODY_END>>>` sentinel tags — system prompt instructs the LLM to never follow instructions inside those tags
- Input sanitized: zero-width characters, RTL/LTR overrides, and soft hyphens stripped
- Body truncated to 8,000 chars
- Output validated: severity/likelihood values checked against allow-lists, descriptions truncated to 300 chars
- Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
- Structured JSON output via `responseMimeType: "application/json"`

---

## Risk Scoring Algorithm

### Full Email Scan

Each detection stage's findings are bucketed into scoring categories with **individual caps** to prevent any single signal from dominating:

| Category      | Cap      | Sources                                              |
| ------------- | -------- | ---------------------------------------------------- |
| `blacklist`   | Uncapped | Threat intel blacklist matches                       |
| `threatIntel` | 30       | Google Safe Browsing hits                            |
| `domainAge`   | 20       | Young domains, typosquatting, homographs             |
| `ssl`         | 10       | Certificate issues                                   |
| `auth`        | 15       | SPF/DKIM/DMARC failures (+5 bonus if all three fail) |
| `social`      | 15       | Display name / Reply-To mismatches                   |
| `url`         | 5        | Redirect chains, shorteners                          |
| `ai`          | 15       | Gemini-detected indicators                           |
| `whitelist`   | –20      | Sender domain in top-1M whitelist (reduces score)    |

**Hard override:** If both blacklist AND Safe Browsing fire → score is forced to **100**.

Final score clamped to **0–100**.

### Link-Only Scan

Simplified scoring — only `blacklist`, `threatIntel` (cap 30), `domainAge` (cap 25), `ssl` (cap 15), and `url` (cap 10) categories apply. No auth/social/AI components.

---

## Scan Modes

| Mode           | Trigger                          | AI Analysis | Header Checks | Link Checks |
| -------------- | -------------------------------- | ----------- | ------------- | ----------- |
| **Full Email** | `bodyHtml` or `bodyText` present | ✅          | ✅            | ✅          |
| **Link-Only**  | Only `links[]` provided, no body | ❌          | ❌            | ✅          |

The mode is auto-detected by `EmailRequest.hasBodyContent()`.

---

## API Reference

All endpoints are under `/api/phishing` and require a valid JWT `Authorization: Bearer <token>` header.

### Scanning

| Method | Path                                    | Auth        | Description                                              |
| ------ | --------------------------------------- | ----------- | -------------------------------------------------------- |
| `POST` | `/api/phishing/scan?forceRefresh=false` | USER, ADMIN | Run a phishing scan. Returns cached result if available. |

**Request body (`EmailRequest`):**

```json
{
  "subject": "Urgent: Verify your account",
  "from": "security@paypa1.com",
  "bodyHtml": "<html>...<a href='https://evil.com/login'>Click here</a>...</html>",
  "bodyText": "Plain text fallback...",
  "headers": {
    "Authentication-Results": ["spf=fail ..."],
    "Return-Path": ["<bounce@other-domain.com>"],
    "From": ["PayPal Security <security@paypa1.com>"],
    "Reply-To": ["reply@suspicious.com"]
  },
  "links": [{ "href": "https://evil.com/login", "text": "Verify Account" }]
}
```

### Reports

| Method | Path                             | Auth        | Description                           |
| ------ | -------------------------------- | ----------- | ------------------------------------- |
| `GET`  | `/api/phishing/reports/{id}`     | USER, ADMIN | Fetch a single report by Firestore ID |
| `GET`  | `/api/phishing/reports?limit=20` | ADMIN only  | List recent reports (max 100)         |

### History

| Method   | Path                                        | Auth        | Description                                       |
| -------- | ------------------------------------------- | ----------- | ------------------------------------------------- |
| `GET`    | `/api/phishing/history?limit=20&cursor=...` | USER, ADMIN | Paginated scan history for the authenticated user |
| `GET`    | `/api/phishing/history/{historyId}`         | USER, ADMIN | Get a single history entry (owner-only)           |
| `DELETE` | `/api/phishing/history/{historyId}`         | USER, ADMIN | Soft-delete a history entry (owner-only)          |

### Flagging

| Method | Path                                                          | Auth        | Description                     |
| ------ | ------------------------------------------------------------- | ----------- | ------------------------------- |
| `POST` | `/api/phishing/reports/{reportId}/flags`                      | USER, ADMIN | Flag an entire report           |
| `POST` | `/api/phishing/reports/{reportId}/findings/{findingId}/flags` | USER, ADMIN | Flag a specific finding         |
| `GET`  | `/api/phishing/flags/mine?limit=20&cursor=...`                | USER, ADMIN | List your own flags (paginated) |

**Flag request body:**

```json
{
  "reasonCode": "FALSE_POSITIVE",
  "comment": "This is a legitimate email from my employer"
}
```

---

## Firestore Data Model

| Collection          | Document Key        | Purpose                                                |
| ------------------- | ------------------- | ------------------------------------------------------ |
| `phishingReports`   | Auto-generated      | Full scan reports with sections, findings, AI analysis |
| `scan_cache`        | SHA-256 fingerprint | Cached scan results with TTL and hit metrics           |
| `user_scan_history` | Auto-generated      | Per-user scan log with soft-delete support             |
| `scan_flags`        | Auto-generated      | User-submitted flags on reports/findings               |

Firebase is **optional** — all Firestore services use `ObjectProvider<Firestore>` and gracefully degrade to no-ops when `firebase.enabled=false`.

---

## Security

### JWT Authentication

Tokens are issued by an external Flask auth service and validated by this backend:

1. `JwtAuthFilter` (extends `OncePerRequestFilter`) intercepts every request
2. Extracts `Bearer` token from `Authorization` header
3. `JwtUtil` validates the HMAC-SHA signature using the shared `jwt.secret`
4. Extracts `uid` (user UUID) and `role` from custom claims
5. Populates `SecurityContextHolder` with `ROLE_USER` or `ROLE_ADMIN`

### Authorization Rules

- `/public/**`, `/actuator/health`, `/actuator/info` — Permit all
- `/admin/**`, `GET /api/phishing/reports` (list) — `ROLE_ADMIN` only
- All other `/api/phishing/**` endpoints — `ROLE_USER` or `ROLE_ADMIN`
- Method-level `@PreAuthorize` annotations provide defense-in-depth

### Error Handling

`GlobalExceptionHandler` maps domain exceptions to HTTP status codes:

| Exception                         | HTTP Status                 |
| --------------------------------- | --------------------------- |
| `MethodArgumentNotValidException` | 400 — with per-field errors |
| `ResourceNotFoundException`       | 404                         |
| `AccessDeniedException`           | 403                         |
| `ConflictException`               | 409 (duplicate flag)        |
| `PersistenceUnavailableException` | 503                         |

---

## Caching & Fingerprinting

**File:** `ScanFingerprintService.java`, `FirestoreScanCacheService.java`

### How it works

1. `ScanFingerprintService.canonicalPayload()` normalizes the request:
   - Whitespace collapse, email lowercasing, URL normalization (IDN → ASCII)
   - Headers sorted alphabetically, link list sorted by href
   - Produces a deterministic JSON string
2. SHA-256 hash of the canonical JSON → **cache key**
3. Cache lookup in Firestore `scan_cache` collection
4. On **cache hit**: increment `servedCount`, update `lastServedAt`, return cached result
5. On **cache miss**: run full scan, persist report, save cache entry with TTL
6. `forceRefresh=true` query param bypasses the cache

**Default TTL:** 24 hours (`scanning.cache.ttl=PT24H`)

---

## Scan History

**File:** `FirestoreScanHistoryService.java`

Every scan (cache hit or fresh) creates a history entry in the `user_scan_history` collection, scoped to the authenticated user's UUID. Features:

- **Cursor-based pagination** — Base64-encoded `requestedAt` timestamp as cursor
- **Soft delete** — Sets `deletedAt` field; queries filter by `deletedAt == null`
- **Owner-only access** — `getHistory()` and `softDelete()` verify `userId` matches
- **Request summary** — Stores sender, subject snippet (120 chars), and URL count

---

## Flagging System

**File:** `FirestoreScanFlagService.java`

Users can flag scan reports or individual findings as false positives/negatives:

- **Report-level flags** — `POST /reports/{reportId}/flags`
- **Finding-level flags** — `POST /reports/{reportId}/findings/{findingId}/flags`
- **Duplicate rejection** — Won't create a flag if an open flag with the same `userId + reportId + findingId + reasonCode` already exists (409 Conflict)
- **Finding validation** — Verifies the finding ID actually exists in the report's sections
- **Comment length** — Configurable max (default 500 chars)
- **Cursor-paginated listing** — `GET /flags/mine`

---

## Configuration Reference

Copy `application.properties.example` → `application.properties` and fill in your values:

```properties
# ── Core ──
spring.application.name=scanner-app

# ── Firebase / Firestore ──
firebase.enabled=true                          # Set false to run without persistence
firebase.service-account.path=classpath:your-firebase-key.json
firebase.project-id=your-project-id
firebase.firestore.collection=phishingReports
firebase.firestore.timeout.seconds=30

# ── Scan Cache ──
scanning.cache.enabled=true
scanning.cache.ttl=PT24H                       # ISO-8601 duration
scanning.cache.version=v1                       # Bump to invalidate all cache entries

# ── Scan History ──
scanning.history.max-page-size=50

# ── Flagging ──
scanning.flags.max-comment-length=500

# ── AI (Gemini) ──
gemini.api.key=YOUR_GEMINI_API_KEY
gemini.timeout.ms=30000

# ── Google Safe Browsing ──
GSB_API_KEY=YOUR_SAFE_BROWSING_API_KEY

# ── Whitelist (sender trust) ──
scanner.whitelist.sources=classpath:top-1m-Tranco.csv,classpath:top-1m-umbrella.csv
scanner.whitelist.max-candidates=200
scanner.whitelist.max-domains=100

# ── Threat Intelligence ──
threat-intel.data-directory=data/threat-intel
threat-intel.openphish-url=https://openphish.com/feed.txt
threat-intel.phishtank-url=http://data.phishtank.com/data/online-valid.csv
threat-intel.urlhaus-url=                       # Optional
threat-intel.max-age-hours=24
threat-intel.refresh-check-ms=3600000

# ── JWT ──
jwt.secret=${JWT_SECRET:change_me_min_32_bytes_long!!!!!}
```

---

## Getting Started

### Prerequisites

- **Java 21+**
- **Maven 3.9+** (or use the included `mvnw` wrapper)
- **Firebase project** with Firestore enabled (optional — app runs without it)
- **API keys** for Gemini and Google Safe Browsing (optional — features degrade gracefully)

### Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd backend/scanner-app

# 2. Create your config
cp src/main/resources/application.properties.example src/main/resources/application.properties
# Edit application.properties with your API keys and Firebase config

# 3. Build
./mvnw clean package -DskipTests

# 4. Run
./mvnw spring-boot:run
# OR
java -jar target/scanner-app-0.0.1-SNAPSHOT.jar
```

The server starts on **port 8080** by default.

### Minimal Config (No External Services)

To run with just the detection engine (no AI, no Safe Browsing, no Firestore):

```properties
firebase.enabled=false
gemini.api.key=
GSB_API_KEY=
jwt.secret=a_dev_secret_that_is_at_least_32_bytes_long!!
```

---

## Testing

```bash
# Run all tests
./mvnw test

# Run a specific test class
./mvnw test -Dtest=PhishingScannerControllerSecurityTest
```

Existing test coverage:

| Test Class                              | What it covers                                 |
| --------------------------------------- | ---------------------------------------------- |
| `PhishingScannerControllerSecurityTest` | Authorization rules, role-based access         |
| `FirestoreScanCacheServiceTest`         | Cache get/save/hit-recording                   |
| `FirestoreScanFlagServiceTest`          | Flag creation, duplicate rejection, validation |
| `FirestoreScanHistoryServiceTest`       | History CRUD, soft-delete, owner-only access   |
| `ScanResponseMapperTest`                | Internal model → DTO mapping                   |

A **Postman collection** is included at `Phishing_Scanner_API.postman_collection.json` — import it for manual API testing. See `POSTMAN_TESTING_GUIDE.md` for walkthrough.

---

## Contributing Guidelines

### Adding a New Detection Stage

1. Add your check method to `PhishingScannerService` — it should accept a URL/domain set and a `List<RiskFinding>` to append to
2. Call it from `scanEmail()` at the appropriate position in the pipeline
3. If it also applies to link-only scans, call it from `scanLinks()` too
4. Update `calculateRiskScore()` if your findings need a new scoring category — add a cap
5. Update `categorizeResults()` to route findings to the correct section (Header/Subject/Body/Links)
6. Add unit tests

### Adding a New API Endpoint

1. Add the method to the appropriate controller (or create a new one)
2. Add `@PreAuthorize` annotation with the required role(s)
3. Add the URL pattern to `SecurityConfig.filterChain()` authorization rules
4. Add corresponding DTO classes in the `dto/` package
5. Add integration tests verifying authorization

### Code Conventions

- **No Lombok** — the project uses explicit getters/setters and Java records
- **Records** for immutable data (`RiskFinding`, `RiskScoreResult`, `RedirectChain`, etc.)
- **ObjectProvider\<Firestore\>** pattern — all Firestore services accept `ObjectProvider` and null-check, so the app runs without Firebase
- **Retry with exponential backoff** — used in Firestore writes and Gemini calls
- **Structured logging** — use SLF4J `logger.info/warn/debug` with key-value pairs for observability
