# AI-Powered Phishing Email Scanner — Backend Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tools, Languages & Environment](#2-tools-languages--environment)
3. [System Architecture](#3-system-architecture)
4. [Key Modules & Classes](#4-key-modules--classes)
5. [Phishing Detection Pipeline (Algorithm)](#5-phishing-detection-pipeline-algorithm)
6. [Weighted Risk Scoring Engine](#6-weighted-risk-scoring-engine)
7. [AI-Powered Analysis (Gemini LLM Integration)](#7-ai-powered-analysis-gemini-llm-integration)
8. [Threat Intelligence Integration](#8-threat-intelligence-integration)
9. [Database Interaction (Firestore)](#9-database-interaction-firestore)
10. [API Reference](#10-api-reference)
11. [Configuration & Setup](#11-configuration--setup)

---

## 1. Project Overview

This backend is part of a multi-layered AI-powered phishing email detection system. It receives email data (subject, sender, body, headers, and embedded URLs) from a browser extension frontend and performs **11 distinct analysis checks** across four categories:

| Category | Checks Performed |
|----------|-----------------|
| **Threat Intelligence** | Blacklist lookup (OpenPhish, PhishTank), Google Safe Browsing API |
| **Domain & URL Analysis** | Domain age (WHOIS), SSL certificate inspection, typosquatting detection, homograph/IDN attack detection, redirect chain resolution |
| **Email Authentication** | SPF, DKIM, DMARC validation, display-name brand impersonation, Reply-To vs From mismatch |
| **AI Semantic Analysis** | Google Gemini LLM-based social engineering detection |

All findings are combined into a **weighted risk score (0–100)** with per-category caps to prevent any single signal from dominating the verdict. Results are persisted to **Google Cloud Firestore** for historical tracking and retrieval.

---

## 2. Tools, Languages & Environment

### Language & Runtime

| Component | Version |
|-----------|---------|
| **Java** | 21 (LTS) |
| **Spring Boot** | 4.0.4 |
| **Build Tool** | Maven (via Maven Wrapper `mvnw`) |

### Key Dependencies

| Dependency | Purpose |
|------------|---------|
| `spring-boot-starter-webmvc` | REST API framework (controllers, request handling, JSON serialization) |
| `spring-boot-starter-validation` | Bean validation with Jakarta Validation annotations (`@NotBlank`, `@Email`, `@Size`) |
| `spring-boot-starter-actuator` | Health checks, metrics, and application monitoring endpoints |
| `spring-ai-jsoup-document-reader` | HTML parsing via Jsoup — used for extracting URLs from HTML email bodies and stripping HTML for plaintext analysis |
| `firebase-admin` (v9.3.0) | Google Firebase Admin SDK — Cloud Firestore integration for persisting scan reports |
| `jackson-databind` | JSON serialization/deserialization for API requests/responses and Gemini API communication |
| `netty-tcnative-boringssl-static` | Native TLS support for gRPC connections to Firebase/Cloud services |
| `spring-boot-devtools` | Hot-reload during development (runtime-only) |

### External APIs & Services

| Service | Role |
|---------|------|
| **Google Gemini API** (`gemini-3.1-flash-lite-preview`) | LLM-based semantic analysis of email content for social engineering, urgency, impersonation |
| **Google Safe Browsing API** (v4) | Checks URLs against Google's real-time database of malware and social engineering sites |
| **OpenPhish Feed** | Community-curated phishing URL blacklist, refreshed every 24 hours |
| **PhishTank Feed** | Verified phishing URL database in CSV format, refreshed every 24 hours |
| **WHOIS Protocol** (RFC 3912) | Domain creation date lookups via direct TCP socket connections to WHOIS servers |
| **Google Cloud Firestore** | NoSQL document database for persisting scan reports |

### External Data Files

| File | Source | Purpose |
|------|--------|---------|
| `top-1m-Tranco.csv` | [Tranco List](https://tranco-list.eu/) | Top 1 million most popular domains — used for typosquatting comparison and sender whitelisting |
| `top-1m-umbrella.csv` | [Cisco Umbrella](https://umbrella.cisco.com/) | Top 1 million domains by DNS popularity — supplementary trusted domain list |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Browser Extension (Frontend)                     │
│                    Scrapes email data → sends to API                    │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ POST /api/phishing/scan
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PhishingScannerController                          │
│                 Validates input → delegates to service                  │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       PhishingScannerService                            │
│                     ┌──────────────────────────┐                        │
│                     │   ANALYSIS PIPELINE      │                        │
│                     │ ┌──────────────────────┐ │                        │
│                     │ │ 1. URL Extraction    │ │                        │
│                     │ │    (HTML / Plaintext) │ │                        │
│                     │ ├──────────────────────┤ │                        │
│                     │ │ 2. Redirect Chain    │──────► RedirectChainResolver
│                     │ │    Resolution        │ │                        │
│                     │ ├──────────────────────┤ │                        │
│                     │ │ 3. Header Analysis   │ │                        │
│                     │ │    (SPF/DKIM/DMARC)  │ │                        │
│                     │ ├──────────────────────┤ │                        │
│                     │ │ 4. Threat Intel      │──────► ThreatIntelService
│                     │ │    Blacklist Check    │ │    (OpenPhish/PhishTank)
│                     │ ├──────────────────────┤ │                        │
│                     │ │ 5. Safe Browsing     │──────► Google Safe Browsing API
│                     │ │    API Check         │ │                        │
│                     │ ├──────────────────────┤ │                        │
│                     │ │ 6. Homograph/IDN     │ │                        │
│                     │ │    Detection         │ │                        │
│                     │ ├──────────────────────┤ │                        │
│                     │ │ 7. Domain Age        │──────► WHOIS Servers (TCP:43)
│                     │ │    (WHOIS Lookup)    │ │                        │
│                     │ ├──────────────────────┤ │                        │
│                     │ │ 8. Typosquatting     │──────► Tranco + Umbrella CSVs
│                     │ │    Detection         │ │                        │
│                     │ ├──────────────────────┤ │                        │
│                     │ │ 9. SSL Certificate   │──────► HTTPS Connections
│                     │ │    Inspection        │ │                        │
│                     │ ├──────────────────────┤ │                        │
│                     │ │ 10. AI/LLM Analysis  │──────► GeminiEmailAnalyzer
│                     │ │     (Gemini)         │ │    (Gemini API)
│                     │ ├──────────────────────┤ │                        │
│                     │ │ 11. Whitelist Check  │──────► WhitelistManager
│                     │ ├──────────────────────┤ │                        │
│                     │ │ 12. Risk Score       │ │                        │
│                     │ │     Calculation      │ │                        │
│                     │ └──────────────────────┘ │                        │
│                     └──────────────────────────┘                        │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       FirestoreReportService                            │
│              Persists report to Firestore → returns reportId            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Key Modules & Classes

### 4.1 `ScannerAppApplication.java` — Application Entry Point

The Spring Boot main class. Annotated with `@EnableScheduling` to support scheduled threat intelligence feed refreshes.

### 4.2 `EmailRequest.java` — Input DTO

Defines the structure of the incoming scan request with Jakarta Bean Validation:

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `subject` | `String` | `@Size(max=500)` | Email subject line |
| `from` | `String` | `@NotBlank`, `@Email` | Sender email address (required) |
| `bodyHtml` | `String` | `@Size(max=500_000)` | HTML body of the email |
| `bodyText` | `String` | `@Size(max=500_000)` | Plaintext body of the email |
| `headers` | `Map<String, List<String>>` | — | Raw email headers (Authentication-Results, From, Reply-To, etc.) |

### 4.3 `PhishingScannerController.java` — REST API Controller

Exposes three endpoints under `/api/phishing`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/scan` | `POST` | Accepts an `EmailRequest`, runs the full analysis pipeline, persists the report, returns the scan result |
| `/reports/{id}` | `GET` | Retrieves a specific saved report by Firestore document ID |
| `/reports` | `GET` | Lists recent reports (accepts `?limit=N`, default 20, max 100) |

Input validation is enforced via `@Valid` on the request body. Validation errors are handled by `GlobalExceptionHandler`, which returns structured JSON error responses with field-level messages.

### 4.4 `PhishingScannerService.java` — Core Analysis Engine (~977 lines)

This is the heart of the system. It orchestrates the entire detection pipeline:

| Method | Responsibility |
|--------|---------------|
| `scanEmail()` | Main entry point — runs all checks, collects findings, calculates score |
| `extractUrlsFromHtml()` / `extractUrlsFromPlainText()` | Extracts URLs from email body using Jsoup (HTML) or regex (plaintext) |
| `inspectAuthenticationHeaders()` | Parses `Authentication-Results` header for SPF, DKIM, DMARC failures |
| `detectDisplayNameMismatch()` | Checks if display name contains a brand name (e.g., "PayPal") but the sender domain doesn't match |
| `detectReplyToMismatch()` | Flags when `Reply-To` domain differs from `From` domain |
| `inspectHomographDomains()` | Detects non-ASCII characters in domains (IDN homograph attacks) using `java.net.IDN` |
| `inspectDomainAges()` | Performs WHOIS lookups via raw TCP socket to determine domain creation date |
| `inspectTyposquatting()` | Compares extracted domains against Tranco/Umbrella top-1M using Levenshtein distance |
| `inspectSslCertificates()` | Connects to HTTPS URLs, inspects X.509 certificate age and issuer |
| `calculateRiskScore()` | Computes the final 0–100 risk score (see [Section 6](#6-weighted-risk-scoring-engine)) |

**Inner types defined in this class:**

| Type | Purpose |
|------|---------|
| `Severity` (enum) | `LOW(5)`, `MEDIUM(15)`, `HIGH(25)` — base score contributions |
| `RiskFinding` | Immutable record of a single finding: target, description, severity, scoreContribution |
| `HeaderInspectionResult` | Tracks SPF/DKIM/DMARC failures AND display-name/Reply-To mismatches |
| `EmailContent` | Builder for HTML/plaintext body content |
| `EmailScanReport` (record) | The final output: subject, sender, urlCount, findings, headerInspection, overallRiskScore, reportId, aiAnalysis |

### 4.5 `RedirectChainResolver.java` — URL Redirect Chain Resolution

Follows HTTP redirect chains to uncover the final destination URL. This is critical because phishing emails commonly use URL shorteners and redirect services to hide malicious destinations.

**How it works:**

1. **Embedded URL extraction (no HTTP needed):** Checks if the URL matches known redirect patterns — Google redirects (`google.com/url?q=...`), Firebase Dynamic Links (`*.page.link`), Salesforce click tracking, and Microsoft Safe Links — and extracts the target URL from query parameters.
2. **HTTP redirect following:** Sends `HEAD` requests with `instanceFollowRedirects=false` to manually track each `3xx` redirect hop, capturing the `Location` header at each step.
3. **Safety limits:** Maximum 10 hops, 5-second timeout per hop.

**Known shortener domains tracked:** `bit.ly`, `tinyurl.com`, `t.co`, `goo.gl`, `ow.ly`, `is.gd`, `buff.ly`, `rb.gy`, `cutt.ly`, `short.io`, `tiny.cc`, `surl.li`, `shorturl.at`, `v.gd`, `rebrand.ly`, `bl.ink`, `lnkd.in`, `aka.ms`.

### 4.6 `GeminiEmailAnalyzer.java` — AI/LLM Integration

Sends email content to Google's Gemini LLM for semantic phishing analysis. This is the novel AI component of the system. See [Section 7](#7-ai-powered-analysis-gemini-llm-integration) for detailed explanation.

### 4.7 `ThreatIntelService.java` — Threat Intelligence Feed Manager

Manages phishing URL blacklists from external threat intelligence feeds. See [Section 8](#8-threat-intelligence-integration) for detailed explanation.

### 4.8 `WhitelistManager.java` — Sender Domain Whitelisting

Loads the top domains from Tranco and Umbrella CSV files and provides a whitelist check for sender domains. Whitelisted senders receive a score reduction (−15 points) to lower false positives for emails from well-known organizations.

**Key design decisions:**
- **Free-email exclusion:** Domains like `gmail.com`, `yahoo.com`, `outlook.com` are explicitly excluded from the whitelist since anyone can create a free email account — these provide no trust signal.
- **Configurable limits:** `max-candidates` (how many CSV rows to scan) and `max-domains` (how many to keep) are configurable to balance memory usage vs coverage.

### 4.9 `FirestoreReportService.java` — Database Persistence

Handles all Firestore interactions with retry logic. See [Section 9](#9-database-interaction-firestore) for detailed explanation.

### 4.10 `FirebaseConfig.java` — Firebase Configuration

Conditional configuration class (`@ConditionalOnProperty(name = "firebase.enabled", havingValue = "true")`). Only initializes Firebase when explicitly enabled, allowing the application to run without Firebase for development/testing. Supports service account credentials from both classpath and filesystem paths.

### 4.11 `GlobalExceptionHandler.java` — Error Handling

Catches `MethodArgumentNotValidException` (thrown when `@Valid` fails) and returns a clean JSON error response:

```json
{
  "status": 400,
  "error": "Validation failed",
  "fields": {
    "from": "Sender (from) must be a valid email address"
  }
}
```

---

## 5. Phishing Detection Pipeline (Algorithm)

When an email is submitted to `/api/phishing/scan`, the following steps execute **sequentially**:

### Step 1: URL Extraction

- If the email has an HTML body, Jsoup parses the DOM and extracts all `<a href="...">` links.
- If the email is plaintext-only, a regex pattern matches `http://` and `https://` URLs.
- All extracted URLs are deduplicated using a `LinkedHashSet`.

### Step 2: Redirect Chain Resolution

For each extracted URL:
1. The `RedirectChainResolver` follows the redirect chain (up to 10 hops).
2. The final destination URL is added to the URL set for further analysis.
3. Findings are generated for:
   - **Long redirect chains** (≥3 hops) → `MEDIUM` severity
   - **Domain changes through redirects** (start domain ≠ end domain) → `LOW` severity
   - **URL shortener usage** → `LOW` severity

### Step 3: Email Header Authentication Analysis

Parses the `Authentication-Results` header to detect:
- **SPF failure** → `MEDIUM` severity (sender IP not authorized)
- **DKIM failure** → `MEDIUM` severity (message integrity compromised)
- **DMARC failure** → `MEDIUM` severity (domain alignment policy violated)
- **Display name brand impersonation** → `MEDIUM` severity (e.g., display name says "PayPal" but sender domain is `evil.com`)
- **Reply-To mismatch** → `LOW` severity (reply domain differs from sender domain)

Brand detection covers 18 commonly impersonated brands: PayPal, eBay, Amazon, Google, Microsoft, Apple, Facebook, Twitter, LinkedIn, Instagram, Chase, Wells Fargo, Citi, IRS, FedEx, UPS, DHL.

### Step 4: Threat Intelligence Blacklist Check

Every URL (original + resolved) is checked against the locally cached blacklist (sourced from OpenPhish + PhishTank). Matches produce `HIGH` severity findings.

### Step 5: Google Safe Browsing API Check

All URLs are batch-submitted to Google Safe Browsing v4 API, checking for:
- `MALWARE` → `HIGH` severity
- `SOCIAL_ENGINEERING` → `HIGH` severity

### Step 6: Homograph/IDN Attack Detection

Each domain is checked for non-ASCII characters using `java.net.IDN.toASCII()`. If the Unicode domain and its ASCII (Punycode) representation differ, it indicates potential IDN homograph attack → `HIGH` severity.

### Step 7: Domain Age Analysis (WHOIS)

For each unique root domain extracted from URLs:
1. A raw TCP socket connection is made to `whois.iana.org` on port 43.
2. If a referral server is returned, a second query is made to the authoritative WHOIS server.
3. The creation date is parsed using multiple date format patterns (ISO 8601, various regional formats).
4. Domains younger than **60 days** → `MEDIUM` severity.
5. Results are cached in a `ConcurrentHashMap` to avoid redundant lookups.

### Step 8: Typosquatting Detection

Each extracted domain is compared against the Tranco + Umbrella top-1M domain lists using the **Levenshtein distance** algorithm:
- If the domain is an **exact match** → skip (it's legitimate).
- If the edit distance is **≤ 3** → flag as potential typosquatting of the trusted domain → `MEDIUM` severity.

Example: `arnazon.com` (edit distance 1 from `amazon.com`) would be flagged.

### Step 9: SSL Certificate Inspection

For each HTTPS URL:
1. An HTTPS connection is established and the server's X.509 certificate is retrieved.
2. **Certificate age**: If the certificate was issued less than **15 days** ago → `LOW` severity.
3. **Let's Encrypt + new domain**: If the certificate is from Let's Encrypt AND the domain is less than **30 days** old → `MEDIUM` severity (attackers commonly use free Let's Encrypt certs on throwaway domains).
4. **SSL handshake failure** → `HIGH` severity (invalid/self-signed certificate).
5. **Unresolvable host** → `LOW` severity (DNS doesn't resolve).

### Step 10: AI/LLM Semantic Analysis

The email body (stripped of HTML via Jsoup) is sent to Google Gemini for semantic analysis. See [Section 7](#7-ai-powered-analysis-gemini-llm-integration) for details.

### Step 11: Whitelist Adjustment & Final Score Calculation

The sender's root domain is checked against the whitelist. If whitelisted, the score is reduced. All findings are then weighted and capped to produce the final 0–100 score. See [Section 6](#6-weighted-risk-scoring-engine).

---

## 6. Weighted Risk Scoring Engine

### 6.1 Severity Tiers

Every finding is assigned one of three severity levels, each with a base score contribution:

| Severity | Base Score | Use Cases |
|----------|-----------|-----------|
| **LOW** | 5 points | New SSL certificate, shortener usage, Reply-To mismatch, unresolvable host |
| **MEDIUM** | 15 points | SPF/DKIM/DMARC failure, young domain, typosquatting, display-name impersonation, long redirect chains |
| **HIGH** | 25 points | Blacklisted URL, Safe Browsing threat, homograph attack, SSL handshake failure |

### 6.2 Score Categories & Caps

To prevent any single category from dominating the overall risk score, each category has a **maximum contribution cap**:

| Category | Includes | Cap | Rationale |
|----------|----------|-----|-----------|
| **Blacklist** | URLs found in OpenPhish/PhishTank blacklists | **Uncapped** | A verified blacklist hit is definitive evidence; no cap needed |
| **Threat Intel** | Google Safe Browsing matches | **30** | Strong signal but can have false positives on shared hosting |
| **Domain** | Domain age, typosquatting, homograph detection | **20** | Important but shouldn't alone condemn an email (new legitimate businesses exist) |
| **SSL** | Certificate age, validation failure, Let's Encrypt on new domains | **10** | Supplementary signal; many legitimate sites have new/free certs |
| **Auth** | SPF, DKIM, DMARC failures | **15** | Meaningful but some legitimate senders have misconfigured records |
| **Social** | Display-name brand impersonation, Reply-To mismatch | **15** | Behavioral signal; useful but can occur in legitimate forwarded emails |
| **URL Behavior** | Redirect chain length, shortener usage, domain change through redirect | **5** | Weak signal on its own; shorteners are widely used in legitimate marketing |
| **AI** | All findings from Gemini LLM analysis | **15** | LLMs can hallucinate; capping prevents overreliance on AI judgment |
| **Whitelist** | Sender domain found in Tranco/Umbrella top-1M | **−20** (max reduction) | Lowers false positives for well-known organizations |

### 6.3 Scoring Formula

```
Score = Blacklist (uncapped)
      + min(ThreatIntel, 30)
      + min(Domain, 20)
      + min(SSL, 10)
      + min(Auth, 15)
      + min(Social, 15)
      + min(URLBehavior, 5)
      + min(AI, 15)
      + max(Whitelist, -20)
```

### 6.4 Bonus & Override Rules

| Rule | Condition | Effect |
|------|-----------|--------|
| **Auth triple-failure bonus** | SPF + DKIM + DMARC all fail | +5 points to Auth category (before cap) |
| **Blacklist + Threat Intel hard override** | URL is in BOTH the blacklist AND flagged by Safe Browsing | Score forced to **100** regardless of other signals |
| **Floor/Ceiling** | Always applied last | Score clamped to range `[0, 100]` |

### 6.5 Risk Classification

| Score Range | Verdict |
|-------------|---------|
| **0–29** | Safe / Low Risk |
| **30–64** | Suspicious / Medium Risk |
| **65–100** | High Risk / Likely Phishing |

### 6.6 Why These Weights?

The weight design follows a **defense-in-depth** philosophy:

1. **Definitive signals dominate:** A verified blacklist hit should instantly flag the email. That's why blacklist findings are uncapped and the hard override exists.
2. **No single weak signal condemns:** URL shorteners, new certificates, and Reply-To mismatches happen in legitimate emails. By capping URL behavior at 5 and SSL at 10, we prevent false positives from these alone.
3. **AI is a supplement, not the judge:** LLMs are powerful at detecting social engineering nuance, but they can hallucinate or be manipulated via prompt injection. Capping AI at 15 ensures it contributes meaningfully without being a single point of failure.
4. **Whitelist provides negative evidence:** Emails from verified top-1M domains (excluding free email providers) are statistically far less likely to be phishing, so a −15 to −20 adjustment prevents flagging legitimate corporate communications.
5. **Category stacking reveals compound attacks:** A phishing email that uses a typosquatted domain (domain: 15), has a new cert (SSL: 5), fails DMARC (auth: 15), and uses urgency language (AI: 15) would score 50 — correctly flagged as suspicious even though no single signal was HIGH.

---

## 7. AI-Powered Analysis (Gemini LLM Integration)

This is the **novel and complex** component of the prototype. Traditional rule-based phishing detection catches known patterns, but sophisticated social engineering — subtle urgency, authority exploitation, emotional manipulation — requires semantic understanding that only an LLM can provide.

### 7.1 Architecture

```
Email body (plaintext)
        │
        ▼
┌─────────────────────┐
│ buildEmailContent() │  Constructs "From: / Subject: / Body:" format
│ (max 8,000 chars)   │  Truncates long bodies to control token cost
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ buildGeminiRequest() │  Wraps content with system prompt + config
│                      │  temperature=0.1 (deterministic)
│                      │  maxOutputTokens=1024
└─────────┬────────────┘
          │
          ▼
┌─────────────────────┐
│  callGeminiApi()    │  HTTPS POST to Gemini API
│  (30s timeout)      │  Model: gemini-3.1-flash-lite-preview
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ parseGeminiResponse()│  Strips markdown fences if present
│                      │  Parses JSON into GeminiAnalysisResult
└─────────┬────────────┘
          │
          ▼
   GeminiAnalysisResult
   ├── phishingLikelihood: "HIGH" | "MEDIUM" | "LOW" | "NONE"
   ├── summary: "One-sentence assessment"
   └── indicators: [
         { indicator: "Urgency Language",
           description: "Email pressures user to act within 24 hours",
           severity: "HIGH" }
       ]
```

### 7.2 System Prompt Design

The LLM is instructed to be a **cybersecurity expert** and analyze the email across 8 specific categories:

1. **Urgency/pressure language** — "act now", "account suspended", "within 24 hours"
2. **Credential harvesting** — requests for passwords, SSN, bank details, OTP
3. **Brand impersonation** — pretending to be a known company
4. **Authority impersonation** — pretending to be CEO, IT admin, government
5. **Suspicious call-to-action** — "click here to verify", "confirm your identity"
6. **Grammar/spelling anomalies** — unusual for the claimed sender
7. **Emotional manipulation** — fear, greed, curiosity tactics
8. **Mismatched context** — invoices not requested, packages not ordered

The prompt enforces **strict JSON-only output** with no markdown wrapping, though the parser defensively strips code fences if the model disobeys.

### 7.3 Retry Logic

The Gemini integration implements **exponential backoff** retry logic to handle transient API failures:

| Attempt | Delay Before Retry |
|---------|-------------------|
| 1st | Immediate |
| 2nd | 1,000ms (1s) |
| 3rd | 2,000ms (2s) |

If all 3 attempts fail, the AI analysis is skipped (returns `null`) and the scan continues with rule-based findings only. The system never blocks or fails the entire scan due to LLM unavailability.

### 7.4 Why `temperature=0.1`?

A near-zero temperature produces highly deterministic outputs. For security classification:
- **Consistency matters** — the same email should produce the same verdict every time.
- **Creativity is harmful** — we don't want the LLM to "imagine" phishing indicators that aren't there.
- A small non-zero value (0.1 vs 0.0) allows slight variation to avoid degenerate token selection while remaining essentially deterministic.

### 7.5 Why Gemini Flash-Lite?

| Factor | Reasoning |
|--------|-----------|
| **Latency** | Flash-Lite is Google's fastest model — critical for a real-time scanner |
| **Cost** | Significantly cheaper than Pro/Ultra models; phishing classification doesn't need reasoning depth of larger models |
| **Accuracy** | Classification and pattern recognition (vs open-ended generation) is well-suited to lighter models |
| **Token limit** | Email bodies are short; 8K input + 1K output is well within Flash-Lite's context window |

---

## 8. Threat Intelligence Integration

### 8.1 Feed Sources

| Feed | URL | Update Frequency | Format |
|------|-----|------------------|--------|
| **OpenPhish** | `https://openphish.com/feed.txt` | Every 24 hours | One URL per line |
| **PhishTank** | `http://data.phishtank.com/data/online-valid.csv` | Every 24 hours | CSV (phish_id, url, ...) |

### 8.2 Lifecycle

```
Application Startup
        │
        ├──► loadFromDisk()    Load cached blacklist.csv from disk (if exists)
        │
        └──► refreshIfDue()    Check metadata timestamp → fetch if >24h old
                │
                ├──► fetchOpenPhish()     GET text feed → normalize URLs
                ├──► fetchPhishTankCsv()  GET CSV feed → parse URL column → normalize
                │
                ├──► Merge all URLs into a single Set<String>
                ├──► persistBlacklistCsv()  Atomic write to disk (tmp → rename)
                └──► writeLastUpdatedTimestamp()

Scheduled Refresh (every 1 hour, configurable)
        │
        └──► refreshIfDue()    Only fetches if last update >24h ago
```

### 8.3 Key Design Decisions

- **Atomic file writes:** The blacklist CSV is written to a temp file first, then atomically moved to prevent corruption if the process crashes mid-write.
- **Thread-safe in-memory store:** Uses `AtomicReference<Set<String>>` for lock-free reads. The entire set is replaced atomically on refresh.
- **Graceful degradation:** If feeds are unreachable, the previous blacklist is retained. If no previous data exists, the blacklist is simply empty.
- **URL normalization:** All URLs are normalized (lowercase scheme/host, consistent path/query formatting) before storage and lookup to ensure matching works correctly.
- **Synchronized refresh:** The `refreshLock` prevents concurrent refresh operations if the scheduled task and a manual trigger overlap.

---

## 9. Database Interaction (Firestore)

### 9.1 Document Schema

Each scan report is stored as a Firestore document in the `phishingReports` collection:

```json
{
  "savedAt": "2026-04-07T12:00:00Z",
  "from": "suspicious@phisher.com",
  "subject": "Urgent: Verify Your Account",
  "sender": "suspicious@phisher.com",
  "urlCount": 3,
  "overallRiskScore": 72,
  "headerInspectionResult": {
    "spfFail": true,
    "dkimFail": false,
    "dmarcFail": true,
    "displayNameMismatch": true,
    "replyToMismatch": false
  },
  "findings": [
    {
      "target": "https://paypa1-secure.com/login",
      "description": "Potential typosquatting of trusted domain 'paypal.com'",
      "severity": "MEDIUM",
      "scoreContribution": 15
    }
  ],
  "aiAnalysis": {
    "phishingLikelihood": "HIGH",
    "summary": "Email uses urgency tactics and impersonates PayPal to harvest credentials.",
    "indicators": [
      {
        "indicator": "Urgency Language",
        "description": "Email claims account will be suspended within 24 hours.",
        "severity": "HIGH"
      }
    ]
  }
}
```

### 9.2 Retry Logic

Firestore writes use exponential backoff (3 attempts, starting at 500ms):

| Attempt | Delay |
|---------|-------|
| 1st | Immediate |
| 2nd | 500ms |
| 3rd | 1,000ms |

If all retries fail, the report ID is returned as `null` — the scan result is still returned to the user, just not persisted. **Database failures never block the scan response.**

### 9.3 Conditional Initialization

Firebase is only initialized when `firebase.enabled=true` in application properties. The `FirestoreReportService` uses Spring's `ObjectProvider<Firestore>` to safely handle the case where Firestore is not available — all methods gracefully return `null` or empty lists with a debug log.

---

## 10. API Reference

### POST `/api/phishing/scan`

**Request Body:**
```json
{
  "from": "sender@example.com",
  "subject": "Urgent: Verify Your Account",
  "bodyHtml": "<html><body><a href='https://evil.com'>Click here</a></body></html>",
  "bodyText": "Please verify your account at https://evil.com",
  "headers": {
    "Authentication-Results": ["spf=pass; dkim=fail; dmarc=fail"],
    "From": ["PayPal <sender@example.com>"],
    "Reply-To": ["different@attacker.com"]
  }
}
```

**Response:**
```json
{
  "subject": "Urgent: Verify Your Account",
  "sender": "sender@example.com",
  "urlCount": 1,
  "findings": [
    {
      "target": "DKIM",
      "description": "DKIM check failed",
      "severity": "MEDIUM",
      "scoreContribution": 15
    },
    {
      "target": "[AI] Urgency Language",
      "description": "Email pressures user to act immediately to avoid account suspension",
      "severity": "HIGH",
      "scoreContribution": 25
    }
  ],
  "headerInspectionResult": {
    "spfFail": false,
    "dkimFail": true,
    "dmarcFail": true,
    "displayNameMismatch": false,
    "replyToMismatch": true
  },
  "overallRiskScore": 62,
  "reportId": "abc123def456",
  "aiAnalysis": {
    "phishingLikelihood": "HIGH",
    "summary": "Email shows strong indicators of credential harvesting phishing.",
    "indicators": [ ... ]
  }
}
```

### GET `/api/phishing/reports/{id}`

Returns the full stored report document from Firestore, or `404 Not Found`.

### GET `/api/phishing/reports?limit=20`

Returns an array of the most recent reports, ordered by `savedAt` descending. Limit is clamped to `[1, 100]`.

---

## 11. Configuration & Setup

### Required Environment Variables / Properties

| Property | Required | Default | Description |
|----------|----------|---------|-------------|
| `gemini.api.key` | Yes (for AI) | _(empty)_ | Google Gemini API key. If empty, AI analysis is skipped |
| `GSB_API_KEY` | Yes (for Safe Browsing) | _(null)_ | Google Safe Browsing API key |
| `firebase.enabled` | No | `false` | Enable/disable Firestore persistence |
| `firebase.service-account.path` | If Firebase enabled | — | Path to Firebase service account JSON |
| `firebase.project-id` | If Firebase enabled | _(empty)_ | GCP project ID |

### Optional Tuning Properties

| Property | Default | Description |
|----------|---------|-------------|
| `gemini.timeout.ms` | `30000` | Gemini API timeout in milliseconds |
| `firebase.firestore.collection` | `phishingReports` | Firestore collection name |
| `firebase.firestore.timeout.seconds` | `30` | Firestore operation timeout |
| `scanner.whitelist.max-candidates` | `200` | Max CSV rows to scan for whitelist |
| `scanner.whitelist.max-domains` | `100` | Max domains to keep in whitelist |
| `threat-intel.max-age-hours` | `24` | Hours before threat feeds are refreshed |
| `threat-intel.refresh-check-ms` | `3600000` | How often to check if refresh is needed (ms) |

### Quick Start

```bash
# 1. Clone and navigate to backend
cd backend/scanner-app

# 2. Create application.properties from example
cp src/main/resources/application.properties.example src/main/resources/application.properties

# 3. Set your API keys in application.properties
#    - gemini.api.key=YOUR_GEMINI_KEY
#    - GSB_API_KEY=YOUR_SAFE_BROWSING_KEY

# 4. Build and run
./mvnw spring-boot:run

# 5. Test with a POST request
curl -X POST http://localhost:8080/api/phishing/scan \
  -H "Content-Type: application/json" \
  -d '{"from":"test@example.com","subject":"Test","bodyText":"Click https://example.com"}'
```
