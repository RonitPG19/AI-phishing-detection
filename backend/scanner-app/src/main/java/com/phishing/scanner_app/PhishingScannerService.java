package com.phishing.scanner_app;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.annotation.JsonProperty;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLHandshakeException;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.IDN;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;


@Service
public class PhishingScannerService {

    private static final int NETWORK_TIMEOUT_MS = 5000;
    private static final int DOMAIN_AGE_SUSPICIOUS_THRESHOLD_DAYS = 60;
    private static final int CERTIFICATE_NEW_THRESHOLD_DAYS = 15;
    private static final int LETS_ENCRYPT_DOMAIN_AGE_THRESHOLD_DAYS = 30;
    private static final int TRUSTED_DOMAIN_LIMIT_PER_FILE = 10_000;
    private static final Pattern PLAIN_TEXT_URL_PATTERN = Pattern.compile("(https?://[^\\s\"'<>()]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern SAFE_BROWSING_MATCH_PATTERN = Pattern.compile("\\\"threatType\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"(?s).*?\\\"threat\\\"\\s*:\\s*\\{(?s).*?\\\"url\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"");
    private static final Pattern WHOIS_CREATION_PATTERN = Pattern.compile("(?im)^(?:created|creation date|created on|registration time|registered on|domain create date)\\s*:\\s*(.+)$");
    private static final Pattern WHOIS_REFERRAL_PATTERN = Pattern.compile("(?im)^(?:refer|whois)\\s*:\\s*(.+)$");
    private static final Set<String> COMMON_SECOND_LEVEL_TLDS = Set.of("ac", "co", "com", "edu", "gov", "net", "org");
    private static final Map<String, Set<String>> BRAND_DOMAIN_MAP = buildBrandDomainMap();
    private static final List<DateTimeFormatter> OFFSET_DATE_TIME_FORMATTERS = buildOffsetDateTimeFormatters();
    private static final List<DateTimeFormatter> LOCAL_DATE_TIME_FORMATTERS = buildLocalDateTimeFormatters();
    private static final List<DateTimeFormatter> LOCAL_DATE_FORMATTERS = buildLocalDateFormatters();
    private static final Map<String, Integer> DOMAIN_AGE_CACHE = new java.util.concurrent.ConcurrentHashMap<>();

    private final Set<String> trustedDomains;
    private final Set<String> openPhishFeed;
    private final RedirectChainResolver redirectChainResolver;

    public PhishingScannerService(RedirectChainResolver redirectChainResolver) {
        this.redirectChainResolver = redirectChainResolver;
        this.trustedDomains = loadTrustedDomains();
        this.openPhishFeed = loadOpenPhishFeed();
    }

    public EmailScanReport scanEmail(EmailRequest request, String safeBrowsingApiKey) {
        String subject = defaultString(request.getSubject(), "(no subject)");
        String sender = request.getFrom();
        EmailContent emailContent = new EmailContent();
        if (request.getBodyHtml() != null) {
            emailContent.appendHtml(request.getBodyHtml());
        }
        if (request.getBodyText() != null) {
            emailContent.appendText(request.getBodyText());
        }
        Set<String> urls = extractUrlsFromContent(emailContent);
        List<RiskFinding> findings = new ArrayList<>();

        // ── Redirect chain resolution ──
        // Resolve shortened/redirected URLs and add final destinations to the URL set
        Set<String> resolvedUrls = new LinkedHashSet<>(urls);
        for (String url : urls) {
            RedirectChainResolver.RedirectChain chain = redirectChainResolver.resolve(url);
            if (chain.wasRedirected()) {
                resolvedUrls.add(chain.finalUrl());

                String startDomain = extractDomainFromUrl(url);
                String finalDomain = extractDomainFromUrl(chain.finalUrl());

                // Flag long redirect chains (3+ hops)
                if (chain.hopCount() >= 3) {
                    findings.add(new RiskFinding(url,
                        "URL has a long redirect chain (" + chain.hopCount() + " hops) ending at " + chain.finalUrl(),
                        Severity.MEDIUM));
                }

                // Flag domain change through redirect
                if (!startDomain.isEmpty() && !finalDomain.isEmpty()
                    && !extractRootDomain(startDomain).equals(extractRootDomain(finalDomain))) {
                    findings.add(new RiskFinding(url,
                        "URL redirects to a different domain: " + startDomain + " → " + finalDomain,
                        Severity.LOW));
                }

                // Flag use of shortener services
                if (RedirectChainResolver.isKnownShortener(startDomain)) {
                    findings.add(new RiskFinding(url,
                        "URL uses shortener (" + startDomain + "), real destination: " + chain.finalUrl(),
                        Severity.LOW));
                }
            }
        }

        // Use the expanded URL set (original + resolved) for all downstream checks
        Set<String> allUrls = resolvedUrls;

        HeaderInspectionResult headerInspectionResult = inspectAuthenticationHeaders(request, findings);
        headerInspectionResult.displayNameMismatch = detectDisplayNameMismatch(request, findings);
        headerInspectionResult.replyToMismatch = detectReplyToMismatch(request, findings);

        checkOpenPhish(allUrls, openPhishFeed, findings);
        checkGoogleSafeBrowsing(allUrls, safeBrowsingApiKey, findings);

        Map<String, String> urlDomainMap = buildUrlDomainMap(allUrls);
        inspectHomographDomains(urlDomainMap, findings);

        Map<String, Integer> domainAgeByRootDomain = inspectDomainAges(urlDomainMap.values(), findings);
        inspectTyposquatting(urlDomainMap.values(), trustedDomains, findings);
        inspectSslCertificates(allUrls, domainAgeByRootDomain, findings);
        

        int overallRiskScore = calculateRiskScore(findings, headerInspectionResult);
        return new EmailScanReport(subject, sender, allUrls.size(), findings, headerInspectionResult, overallRiskScore, null);
    }

    private static Set<String> extractUrlsFromContent(EmailContent emailContent) {
        if (emailContent.hasHtml()) {
            return extractUrlsFromHtml(emailContent.getHtml());
        } else {
            return extractUrlsFromPlainText(emailContent.getText());
        }
    }

    private static Set<String> extractUrlsFromHtml(String html) {
        if (isBlank(html)) return Collections.emptySet();
        Set<String> urls = new LinkedHashSet<>();
        Document doc = Jsoup.parse(html);
        for (Element link : doc.select("a[href]")) {
            String href = link.attr("href");
            if (href.startsWith("http://") || href.startsWith("https://")) {
                urls.add(href);
            }
        }
        return urls;
    }

    private static Set<String> extractUrlsFromPlainText(String text) {
        if (isBlank(text)) return Collections.emptySet();
        Set<String> urls = new LinkedHashSet<>();
        Matcher matcher = PLAIN_TEXT_URL_PATTERN.matcher(text);
        while (matcher.find()) {
            urls.add(matcher.group(1));
        }
        return urls;
    }
    private static void checkOpenPhish(Set<String> urls, Set<String> openPhishFeed, List<RiskFinding> findings) {
        for (String url : urls) {
            String normalized = normalizeUrl(url);
            if (openPhishFeed.contains(normalized)) {
                findings.add(new RiskFinding(url, "URL found in OpenPhish feed", Severity.HIGH));
            }
        }
    }

    private static void checkGoogleSafeBrowsing(Set<String> urls, String apiKey, List<RiskFinding> findings) {
        if (isBlank(apiKey) || urls.isEmpty()) {
            return;
        }
        try {
            String requestBody = buildSafeBrowsingRequestBody(urls);
            URI uri = URI.create("https://safebrowsing.googleapis.com/v4/threatMatches:find?key=" + apiKey);
            URL url = uri.toURL();
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(NETWORK_TIMEOUT_MS);
            connection.setReadTimeout(NETWORK_TIMEOUT_MS);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setDoOutput(true);
            try (OutputStream os = connection.getOutputStream()) {
                os.write(requestBody.getBytes(StandardCharsets.UTF_8));
            }
            int responseCode = connection.getResponseCode();
            if (responseCode == 200) {
                String responseBody = readFully(connection.getInputStream());
                Map<String, Set<String>> threatMap = parseSafeBrowsingResponse(responseBody);
                for (Map.Entry<String, Set<String>> entry : threatMap.entrySet()) {
                    String threatType = entry.getKey();
                    for (String matchedUrl : entry.getValue()) {
                        findings.add(new RiskFinding(matchedUrl, "Google Safe Browsing threat: " + threatType, safeBrowsingSeverity(threatType)));
                    }
                }
            } else {
                logWarning("Safe Browsing API returned " + responseCode, null);
            }
        } catch (Exception exception) {
            logWarning("Failed to check Google Safe Browsing", exception);
        }
    }

    private static String buildSafeBrowsingRequestBody(Set<String> urls) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"client\":{\"clientId\":\"phishing-scanner\",\"clientVersion\":\"1.0\"},\"threatInfo\":{\"threatTypes\":[\"MALWARE\",\"SOCIAL_ENGINEERING\"],\"platformTypes\":[\"ANY_PLATFORM\"],\"threatEntryTypes\":[\"URL\"],\"threatEntries\":[");
        boolean first = true;
        for (String url : urls) {
            if (!first) sb.append(",");
            sb.append("{\"url\":\"").append(escapeJson(url)).append("\"}");
            first = false;
        }
        sb.append("]}}");
        return sb.toString();
    }

    private static Map<String, Set<String>> parseSafeBrowsingResponse(String responseBody) {
        Map<String, Set<String>> threatMap = new HashMap<>();
        Matcher matcher = SAFE_BROWSING_MATCH_PATTERN.matcher(responseBody);
        while (matcher.find()) {
            String threatType = matcher.group(1);
            String url = unescapeJson(matcher.group(2));
            threatMap.computeIfAbsent(threatType, k -> new LinkedHashSet<>()).add(url);
        }
        return threatMap;
    }

    private static HeaderInspectionResult inspectAuthenticationHeaders(EmailRequest request, List<RiskFinding> findings) {
        HeaderInspectionResult result = new HeaderInspectionResult();
        if (request.getHeaders() == null) return result;
        List<String> authResults = request.getHeaders().get("Authentication-Results");
        if (authResults != null) {
            for (String header : authResults) {
                if (header.contains("spf=fail")) {
                    result.spfFail = true;
                    findings.add(new RiskFinding("SPF", "SPF check failed", Severity.MEDIUM));
                }
                if (header.contains("dkim=fail")) {
                    result.dkimFail = true;
                    findings.add(new RiskFinding("DKIM", "DKIM check failed", Severity.MEDIUM));
                }
                if (header.contains("dmarc=fail")) {
                    result.dmarcFail = true;
                    findings.add(new RiskFinding("DMARC", "DMARC check failed", Severity.MEDIUM));
                }
            }
        }
        return result;
    }

    private static boolean detectDisplayNameMismatch(EmailRequest request, List<RiskFinding> findings) {
        String from = request.getFrom();
        List<String> fromHeaders = request.getHeaders().get("From");
        if (fromHeaders == null || fromHeaders.isEmpty()) return false;
        String displayName = extractDisplayName(fromHeaders.get(0));
        if (isBlank(displayName)) return false;
        String senderDomain = extractFromDomain(from);
        for (String keyword : BRAND_DOMAIN_MAP.keySet()) {
            if (displayName.toLowerCase().contains(keyword.toLowerCase())) {
                if (!matchesBrandDomain(extractRootDomain(senderDomain), BRAND_DOMAIN_MAP.get(keyword), keyword)) {
                    findings.add(new RiskFinding(displayName, "Display name contains brand '" + keyword + "' but sender domain does not match", Severity.MEDIUM));
                    return true;
                }
            }
        }
        return false;
    }

    private static boolean detectReplyToMismatch(EmailRequest request, List<RiskFinding> findings) {
        List<String> replyToHeaders = request.getHeaders().get("Reply-To");
        if (replyToHeaders == null || replyToHeaders.isEmpty()) return false;
        String replyToDomain = extractDomainFromAddresses(replyToHeaders.get(0));
        String fromDomain = extractFromDomain(request.getFrom());
        String rootReplyTo = extractRootDomain(replyToDomain);
        String rootFrom = extractRootDomain(fromDomain);
        if (!rootReplyTo.equals(rootFrom)) {
            findings.add(new RiskFinding(replyToDomain, "Reply-To domain differs from From domain", Severity.LOW));
            return true;
        }
        return false;
    }

    private static void inspectHomographDomains(Map<String, String> urlDomainMap, List<RiskFinding> findings) {
        for (Map.Entry<String, String> entry : urlDomainMap.entrySet()) {
            String url = entry.getKey();
            String domain = entry.getValue();
            if (containsNonAscii(domain)) {
                findings.add(new RiskFinding(url, "Domain contains non-ASCII characters (potential homograph attack)", Severity.HIGH));
            }
        }
    }

    private static boolean containsNonAscii(String domain) {
        return !domain.equals(IDN.toASCII(domain));
    }

    private static Map<String, Integer> inspectDomainAges(Collection<String> domains, List<RiskFinding> findings) {
        Map<String, Integer> domainAgeByRootDomain = new HashMap<>();
        for (String domain : domains) {
            String rootDomain = extractRootDomain(domain);
            Integer age = DOMAIN_AGE_CACHE.computeIfAbsent(rootDomain, PhishingScannerService::lookupDomainAgeInDays);
            domainAgeByRootDomain.put(rootDomain, age);
            if (age != null && age < DOMAIN_AGE_SUSPICIOUS_THRESHOLD_DAYS) {
                findings.add(new RiskFinding(rootDomain, "Domain is only " + age + " days old", Severity.MEDIUM));
            }
        }
        return domainAgeByRootDomain;
    }

    private static Integer lookupDomainAgeInDays(String rootDomain) {
        try {
            String whoisResponse = queryWhoisServer("whois.iana.org", rootDomain);
            String referralServer = extractWhoisReferralServer(whoisResponse);
            if (referralServer != null) {
                whoisResponse = queryWhoisServer(referralServer, rootDomain);
            }
            LocalDate creationDate = extractCreationDate(whoisResponse);
            if (creationDate != null) {
                return (int) ChronoUnit.DAYS.between(creationDate, LocalDate.now());
            }
        } catch (Exception exception) {
            logWarning("Failed to lookup domain age for " + rootDomain, exception);
        }
        return null;
    }

    private static String queryWhoisServer(String server, String domain) throws IOException {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(server, 43), NETWORK_TIMEOUT_MS);
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
                 BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8))) {
                writer.write(domain + "\r\n");
                writer.flush();
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line).append('\n');
                }
                return response.toString();
            }
        }
    }

    private static LocalDate extractCreationDate(String whoisResponse) {
        Matcher matcher = WHOIS_CREATION_PATTERN.matcher(whoisResponse);
        if (matcher.find()) {
            return parseWhoisDateValue(matcher.group(1).trim());
        }
        return null;
    }

    private static String extractWhoisReferralServer(String whoisResponse) {
        Matcher matcher = WHOIS_REFERRAL_PATTERN.matcher(whoisResponse);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    private static LocalDate parseWhoisDateValue(String rawDate) {
        for (DateTimeFormatter formatter : OFFSET_DATE_TIME_FORMATTERS) {
            try {
                OffsetDateTime odt = OffsetDateTime.parse(rawDate, formatter);
                return odt.toLocalDate();
            } catch (Exception ignored) {}
        }
        for (DateTimeFormatter formatter : LOCAL_DATE_TIME_FORMATTERS) {
            try {
                LocalDateTime ldt = LocalDateTime.parse(rawDate, formatter);
                return ldt.toLocalDate();
            } catch (Exception ignored) {}
        }
        for (DateTimeFormatter formatter : LOCAL_DATE_FORMATTERS) {
            try {
                return LocalDate.parse(rawDate, formatter);
            } catch (Exception ignored) {}
        }
        return null;
    }

    private static void inspectTyposquatting(Collection<String> domains, Set<String> trustedDomains, List<RiskFinding> findings) {
        for (String domain : domains) {
            String similar = findSimilarTrustedDomain(domain, trustedDomains);
            if (similar != null) {
                findings.add(new RiskFinding(domain, "Potential typosquatting of trusted domain '" + similar + "'", Severity.MEDIUM));
            }
        }
    }

    private static String findSimilarTrustedDomain(String extractedDomain, Set<String> trustedDomains) {
        // 1. First check if it's a perfect match (legitimate domain)
        if (trustedDomains.contains(extractedDomain)) {
            return null; // It's a trusted domain, no typosquatting here
        }
        // 2. Then check if it's a close match
        for (String trusted : trustedDomains) {
            if (levenshteinDistance(extractedDomain, trusted) <= 3) {
                return trusted;
            }
        }
        return null;
    }

    private static int levenshteinDistance(String left, String right) {
        int len0 = left.length() + 1;
        int len1 = right.length() + 1;
        int[] cost = new int[len0];
        int[] newcost = new int[len0];
        for (int i = 0; i < len0; i++) cost[i] = i;
        for (int j = 1; j < len1; j++) {
            newcost[0] = j;
            for (int i = 1; i < len0; i++) {
                int match = (left.charAt(i - 1) == right.charAt(j - 1)) ? 0 : 1;
                int cost_replace = cost[i - 1] + match;
                int cost_insert = cost[i] + 1;
                int cost_delete = newcost[i - 1] + 1;
                newcost[i] = Math.min(Math.min(cost_insert, cost_delete), cost_replace);
            }
            int[] swap = cost;
            cost = newcost;
            newcost = swap;
        }
        return cost[len0 - 1];
    }

    private static void inspectSslCertificates(Set<String> urls, Map<String, Integer> domainAgeByRootDomain, List<RiskFinding> findings) {
        for (String url : urls) {
            try {
                URI uri = URI.create(url);
                if (!"https".equals(uri.getScheme())) continue;
                String host = uri.getHost();
                if (host == null) continue;
                String rootDomain = extractRootDomain(host);
                Integer domainAge = domainAgeByRootDomain.get(rootDomain);
                URI uri_connection = URI.create(url);
                HttpsURLConnection connection = (HttpsURLConnection) uri_connection.toURL().openConnection();
                connection.setConnectTimeout(NETWORK_TIMEOUT_MS);
                connection.setReadTimeout(NETWORK_TIMEOUT_MS);
                connection.connect();
                Certificate[] certs = connection.getServerCertificates();
                if (certs.length > 0 && certs[0] instanceof X509Certificate) {
                    X509Certificate cert = (X509Certificate) certs[0];
                    Instant notBefore = cert.getNotBefore().toInstant();
                    long daysSinceIssuance = ChronoUnit.DAYS.between(notBefore, Instant.now());
                    if (daysSinceIssuance < CERTIFICATE_NEW_THRESHOLD_DAYS) {
                        findings.add(new RiskFinding(url, "SSL certificate is very new (" + daysSinceIssuance + " days old)", Severity.LOW));
                    }
                    String issuer = cert.getIssuerX500Principal().getName();
                    if (issuer.contains("Let's Encrypt") && domainAge != null && domainAge < LETS_ENCRYPT_DOMAIN_AGE_THRESHOLD_DAYS) {
                        findings.add(new RiskFinding(url, "Let's Encrypt certificate on very new domain", Severity.MEDIUM));
                    }
                }
                connection.disconnect();
            } catch (java.net.UnknownHostException e) {
                // Domain doesn't resolve — itself a signal, optionally add a LOW finding
                findings.add(new RiskFinding(url, "Domain does not resolve (unresolvable host)", Severity.LOW));
            } catch (SSLHandshakeException exception) {
                findings.add(new RiskFinding(url, "SSL certificate validation failed", Severity.HIGH));
            } catch (Exception exception) {
                logWarning("Failed to inspect SSL certificate for " + url, exception);
            }
        }
    }

    private static Set<String> loadTrustedDomains() {
        Set<String> trustedDomains = new LinkedHashSet<>();
        Path appDir = resolveApplicationDirectory();
        loadTrustedDomainsFromCsv(appDir.resolve("classes\\top-1m-Tranco.csv"), trustedDomains);
        loadTrustedDomainsFromCsv(appDir.resolve("classes\\top-1m-umbrella.csv"), trustedDomains);
        return trustedDomains;
    }

    private static void loadTrustedDomainsFromCsv(Path csvPath, Set<String> trustedDomains) {
        if (!Files.exists(csvPath)) {
            logWarning("Trusted domains CSV not found: " + csvPath, null);
            return;
        }
        try {
            List<String> lines = Files.readAllLines(csvPath, StandardCharsets.UTF_8);
            for (String line : lines) {
                if (trustedDomains.size() >= TRUSTED_DOMAIN_LIMIT_PER_FILE) break;
                String[] parts = line.split(",");
                if (parts.length >= 2) {
                    String domain = parts[1].trim().toLowerCase();
                    if (!domain.isEmpty()) {
                        trustedDomains.add(domain);
                    }
                }
            }
        } catch (Exception exception) {
            logWarning("Failed to load trusted domains from " + csvPath, exception);
        }
    }

    private static Set<String> loadOpenPhishFeed() {
        Set<String> feed = new LinkedHashSet<>();
        try {
            URI uri = URI.create("https://openphish.com/feed.txt");
            URL url = uri.toURL();
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(NETWORK_TIMEOUT_MS);
            connection.setReadTimeout(NETWORK_TIMEOUT_MS);
            int responseCode = connection.getResponseCode();
            if (responseCode == 200) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        String normalized = normalizeUrl(line.trim());
                        if (!normalized.isEmpty()) {
                            feed.add(normalized);
                        }
                    }
                }
            } else {
                logWarning("OpenPhish feed returned " + responseCode, null);
            }
        } catch (Exception exception) {
            logWarning("Failed to load OpenPhish feed", exception);
        }
        return feed;
    }

    private static int calculateRiskScore(List<RiskFinding> findings, HeaderInspectionResult headerInspectionResult) {
        int score = findings.stream().mapToInt(RiskFinding::scoreContribution).sum();
        if (headerInspectionResult.spfFail && headerInspectionResult.dkimFail && headerInspectionResult.dmarcFail) {
            score += 20; // Triple fail bonus
        }
        return Math.min(score, 100);
    }

    private static String extractFromDomain(String from) {
        return extractDomainFromAddresses(from);
    }

    private static String extractDomainFromAddresses(String address) {
        if (isBlank(address)) return "";
        int atIndex = address.lastIndexOf('@');
        if (atIndex == -1) return "";
        return address.substring(atIndex + 1);
    }

    private static String extractDisplayName(String fromHeader) {
        if (isBlank(fromHeader)) return null;
        int ltIndex = fromHeader.indexOf('<');
        if (ltIndex > 0) {
            return fromHeader.substring(0, ltIndex).trim();
        }
        return null;
    }

    private static String extractDomainFromUrl(String url) {
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            if (host != null) {
                return IDN.toUnicode(host);
            }
        } catch (Exception ignored) {}
        return "";
    }

    private static String normalizeDomain(String domain) {
        if (isBlank(domain)) return "";
        try {
            return IDN.toASCII(domain.toLowerCase());
        } catch (Exception ignored) {
            return domain.toLowerCase();
        }
    }

    private static String extractRootDomain(String domain) {
        if (isBlank(domain)) return "";
        String normalized = normalizeDomain(domain);
        String[] parts = normalized.split("\\.");
        if (parts.length < 2) return normalized;
        String tld = parts[parts.length - 1];
        String sld = parts[parts.length - 2];
        if (COMMON_SECOND_LEVEL_TLDS.contains(sld + "." + tld)) {
            if (parts.length >= 3) {
                return parts[parts.length - 3] + "." + sld + "." + tld;
            }
        }
        return sld + "." + tld;
    }

    private static String normalizeUrl(String rawUrl) {
        if (isBlank(rawUrl)) return "";
        try {
            URI uri = URI.create(rawUrl);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            int port = uri.getPort();
            String path = uri.getPath();
            String query = uri.getQuery();
            if (host != null) {
                host = normalizeDomain(host);
            }
            StringBuilder sb = new StringBuilder();
            if (scheme != null) sb.append(scheme).append("://");
            if (host != null) sb.append(host);
            if (port != -1) sb.append(":").append(port);
            if (path != null) sb.append(path);
            if (query != null) sb.append("?").append(query);
            return sb.toString();
        } catch (Exception ignored) {
            return rawUrl;
        }
    }

    private static Map<String, String> buildUrlDomainMap(Set<String> urls) {
        Map<String, String> map = new LinkedHashMap<>();
        for (String url : urls) {
            String domain = extractDomainFromUrl(url);
            if (!domain.isEmpty()) {
                map.put(url, domain);
            }
        }
        return map;
    }

    private static boolean matchesBrandDomain(String senderRootDomain, Set<String> allowedDomains, String keyword) {
        for (String allowed : allowedDomains) {
            if (senderRootDomain.equalsIgnoreCase(allowed) || senderRootDomain.endsWith("." + allowed)) {
                return true;
            }
        }
        return false;
    }

    private static Severity safeBrowsingSeverity(String threatType) {
        return switch (threatType) {
            case "MALWARE" -> Severity.HIGH;
            case "SOCIAL_ENGINEERING" -> Severity.HIGH;
            default -> Severity.MEDIUM;
        };
    }

    private static Path resolveApplicationDirectory() {
        try {
            return Paths.get(PhishingScannerService.class.getProtectionDomain().getCodeSource().getLocation().toURI()).getParent();
        } catch (Exception exception) {
            return Paths.get(".");
        }
    }

    private static String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }

    private static String unescapeJson(String value) {
        return value.replace("\\\"", "\"").replace("\\\\", "\\").replace("\\n", "\n").replace("\\r", "\r").replace("\\t", "\t");
    }

    private static String readFully(InputStream inputStream) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append('\n');
            }
            return sb.toString();
        }
    }

    private static void logWarning(String message, Exception exception) {
        if (exception != null) {
                System.err.println("WARNING: " + message + ": " + exception.getMessage());
            } else {
                System.err.println("WARNING: " + message);
            }
    }

    private static Map<String, Set<String>> buildBrandDomainMap() {
        Map<String, Set<String>> map = new HashMap<>();
        map.put("paypal", Set.of("paypal.com"));
        map.put("ebay", Set.of("ebay.com"));
        map.put("amazon", Set.of("amazon.com"));
        map.put("google", Set.of("google.com"));
        map.put("microsoft", Set.of("microsoft.com"));
        map.put("apple", Set.of("apple.com"));
        map.put("facebook", Set.of("facebook.com"));
        map.put("twitter", Set.of("twitter.com"));
        map.put("linkedin", Set.of("linkedin.com"));
        map.put("instagram", Set.of("instagram.com"));
        map.put("bank", Set.of("bank.com"));
        map.put("chase", Set.of("chase.com"));
        map.put("wells fargo", Set.of("wellsfargo.com"));
        map.put("citi", Set.of("citi.com"));
        map.put("irs", Set.of("irs.gov"));
        map.put("fedex", Set.of("fedex.com"));
        map.put("ups", Set.of("ups.com"));
        map.put("dhl", Set.of("dhl.com"));
        return map;
    }

    private static List<DateTimeFormatter> buildOffsetDateTimeFormatters() {
        return List.of(
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("yyyy-MM-dd HH:mm:ss Z").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("yyyy-MM-dd'T'HH:mm:ssZ").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("yyyy-MM-dd HH:mm:ss").appendOffset("+HHMM", "Z").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("yyyy.MM.dd HH:mm:ss Z").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd-MMM-yyyy HH:mm:ss Z").toFormatter(Locale.ENGLISH)
        );
    }

    private static List<DateTimeFormatter> buildLocalDateTimeFormatters() {
        return List.of(
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("yyyy-MM-dd HH:mm:ss").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("yyyy-MM-dd'T'HH:mm:ss").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("yyyy.MM.dd HH:mm:ss").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd-MMM-yyyy HH:mm:ss").toFormatter(Locale.ENGLISH)
        );
    }

    private static List<DateTimeFormatter> buildLocalDateFormatters() {
        return List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("yyyy/MM/dd").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("yyyy.MM.dd").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd-MMM-yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("MMM dd yyyy").toFormatter(Locale.ENGLISH)
        );
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String defaultString(String value, String fallback) {
        return value == null ? fallback : value;
    }

    public enum Severity {
        LOW(5),
        MEDIUM(15),
        HIGH(25);

        private final int score;

        Severity(int score) {
            this.score = score;
        }

        public int score() {
            return score;
        }
    }

    public static final class RiskFinding {
        private final String target;
        private final String description;
        private final Severity severity;
        private final int scoreContribution;

        public RiskFinding(String target, String description, Severity severity) {
            this(target, description, severity, severity.score());
        }

        public RiskFinding(String target, String description, Severity severity, int scoreContribution) {
            this.target = target;
            this.description = description;
            this.severity = severity;
            this.scoreContribution = scoreContribution;
        }

        @JsonProperty("target")
        public String target() {
            return target;
        }
        
        @JsonProperty("description")
        public String description() {
            return description;
        }

        @JsonProperty("severity")
        public Severity severity() {
            return severity;
        }

        @JsonProperty("scoreContribution")
        public int scoreContribution() {
            return scoreContribution;
        }
    }

    public static final class HeaderInspectionResult {
        public boolean spfFail;
        public boolean dkimFail;
        public boolean dmarcFail;
        public boolean displayNameMismatch;
        public boolean replyToMismatch;
    }

    public static final class EmailContent {
        private final StringBuilder html = new StringBuilder();
        private final StringBuilder text = new StringBuilder();

        public void appendHtml(String htmlPart) {
            html.append(htmlPart).append('\n');
        }

        public void appendText(String textPart) {
            text.append(textPart).append('\n');
        }

        public boolean hasHtml() {
            return html.length() > 0;
        }

        public String getHtml() {
            return html.toString();
        }

        public String getText() {
            return text.toString();
        }
    }

    public record EmailScanReport(
        String subject,
        String sender,
        int urlCount,
        List<RiskFinding> findings,
        HeaderInspectionResult headerInspectionResult,
        int overallRiskScore,
        String reportId
    ) {
    }
}