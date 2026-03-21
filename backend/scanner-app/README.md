# 🛡️ Phishing Scanner — Spring Boot Backend

A RESTful API built with **Spring Boot 4.0** that scans emails for phishing indicators. It analyses URLs, email headers, SSL certificates, domain age, and more to produce a risk score.

---

## 📋 Prerequisites

| Tool | Version |
|------|---------|
| Java | **21+** |
| Maven | **3.9+** (or use the included `mvnw` wrapper) |

**Optional** — set a Google Safe Browsing API key to enable malware/social-engineering URL checks:

```properties
# src/main/resources/application.properties
GSB_API_KEY=your_google_safe_browsing_api_key
```

---

## 🚀 Setup & Run

```bash
# 1. Clone the repository & navigate to the backend
cd backend/scanner-app

# 2. Build the project
./mvnw clean install        # Linux / macOS
mvnw.cmd clean install      # Windows

# 3. Run the application (starts on port 8080 by default)
./mvnw spring-boot:run      # Linux / macOS
mvnw.cmd spring-boot:run    # Windows
```

The server will be available at **`http://localhost:8080`**.

---

## 📡 API Reference

### `POST /api/phishing/scan`

Scans an email for phishing indicators and returns a detailed risk report.

#### Request

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |

#### Request Body (JSON)

```json
{
  "subject": "Urgent: Verify your account",
  "from": "support@example.com",
  "bodyHtml": "<html><body><a href='https://suspicious-site.com/login'>Click here</a></body></html>",
  "bodyText": "Visit https://suspicious-site.com/login to verify your account.",
  "headers": {
    "Authentication-Results": [
      "mx.google.com; spf=pass; dkim=pass; dmarc=pass"
    ],
    "From": [
      "PayPal Support <support@example.com>"
    ],
    "Reply-To": [
      "reply@different-domain.com"
    ]
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | `string` | No | Email subject line |
| `from` | `string` | No | Sender email address |
| `bodyHtml` | `string` | No | HTML body of the email |
| `bodyText` | `string` | No | Plain-text body of the email |
| `headers` | `object` | No | Map of header names → list of values |

> **Note:** At least one of `bodyHtml` or `bodyText` should be provided for URL extraction to work.

#### Example `curl` Request

```bash
curl -X POST http://localhost:8080/api/phishing/scan \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Urgent: Verify your account",
    "from": "support@example.com",
    "bodyHtml": "<html><body><a href=\"https://suspicious-site.com/login\">Click here</a></body></html>",
    "headers": {
      "Authentication-Results": ["mx.google.com; spf=fail; dkim=fail; dmarc=fail"],
      "From": ["PayPal Support <support@example.com>"]
    }
  }'
```

#### Response (JSON)

```json
{
  "subject": "Urgent: Verify your account",
  "sender": "support@example.com",
  "urlCount": 1,
  "findings": [
    {
      "target": "SPF",
      "description": "SPF check failed",
      "severity": "MEDIUM",
      "scoreContribution": 15
    },
    {
      "target": "DKIM",
      "description": "DKIM check failed",
      "severity": "MEDIUM",
      "scoreContribution": 15
    },
    {
      "target": "DMARC",
      "description": "DMARC check failed",
      "severity": "MEDIUM",
      "scoreContribution": 15
    },
    {
      "target": "PayPal Support",
      "description": "Display name contains brand 'paypal' but sender domain does not match",
      "severity": "MEDIUM",
      "scoreContribution": 15
    }
  ],
  "headerInspectionResult": {
    "spfFail": true,
    "dkimFail": true,
    "dmarcFail": true,
    "displayNameMismatch": true,
    "replyToMismatch": false
  },
  "overallRiskScore": 80
}
```

| Field | Type | Description |
|-------|------|-------------|
| `subject` | `string` | Echoed email subject |
| `sender` | `string` | Echoed sender address |
| `urlCount` | `int` | Number of URLs extracted from the email body |
| `findings` | `array` | List of individual risk findings |
| `findings[].target` | `string` | The URL, header, or domain the finding relates to |
| `findings[].description` | `string` | Human-readable description of the risk |
| `findings[].severity` | `string` | `LOW` (5 pts), `MEDIUM` (15 pts), or `HIGH` (25 pts) |
| `findings[].scoreContribution` | `int` | Points this finding adds to the overall score |
| `headerInspectionResult` | `object` | Results of SPF / DKIM / DMARC and other header checks |
| `overallRiskScore` | `int` | Aggregate risk score (0–100). Higher = more suspicious |

---

## 🔍 What Gets Checked

| Check | Severity | Description |
|-------|----------|-------------|
| **OpenPhish Feed** | HIGH | URL matched against the live OpenPhish phishing feed |
| **Google Safe Browsing** | HIGH | URL flagged by Google's Safe Browsing API |
| **Homograph Attack** | HIGH | Domain uses non-ASCII characters (IDN spoofing) |
| **SSL Validation Failure** | HIGH | HTTPS certificate handshake fails |
| **SPF / DKIM / DMARC Fail** | MEDIUM | Email authentication headers indicate failure |
| **Display Name Mismatch** | MEDIUM | Sender display name contains a known brand but domain doesn't match |
| **Young Domain** | MEDIUM | Domain registered less than 60 days ago |
| **Let's Encrypt + New Domain** | MEDIUM | Free cert on a very new domain |
| **Typosquatting** | MEDIUM | Domain is within 3 Levenshtein edits of a top trusted domain |
| **Reply-To Mismatch** | LOW | Reply-To domain differs from From domain |
| **New SSL Certificate** | LOW | Certificate issued less than 15 days ago |
| **Unresolvable Host** | LOW | Domain does not resolve via DNS |

---

## 📂 Project Structure

```
backend/scanner-app/
├── src/main/java/com/phishing/scanner_app/
│   ├── ScannerAppApplication.java        # Spring Boot entry point
│   ├── PhishingScannerController.java    # REST controller
│   ├── PhishingScannerService.java       # Core scanning logic
│   └── EmailRequest.java                # Request DTO
├── src/main/resources/
│   ├── application.properties            # App config
│   ├── top-1m-Tranco.csv                # Tranco top-1M trusted domains
│   └── top-1m-umbrella.csv              # Cisco Umbrella top-1M domains
├── pom.xml                               # Maven dependencies
└── mvnw / mvnw.cmd                       # Maven wrapper scripts
```

---

## ⚙️ Tech Stack

- **Java 21**
- **Spring Boot 4.0.4** (Web MVC, Actuator, DevTools)
- **Spring AI** — Jsoup document reader for HTML parsing
- **Jsoup** — HTML link extraction
- **WHOIS lookup** — Raw socket queries for domain age
- **Google Safe Browsing API v4** (optional)
- **OpenPhish** — Live phishing feed

---

## TODO:

- Add Auth using JWT Tokens from Flask
- Add Attachment checking using AI
- Add Acutal AI 
- Add Proper Implementation of Google Safe Browsing API v4
- 


