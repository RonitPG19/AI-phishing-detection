package com.phishing.scanner_app;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Follows HTTP redirect chains to uncover the final destination URL.
 * Handles common redirect services (shorteners, Google redirects, Firebase links, Salesforce click tracking).
 */
@Component
public class RedirectChainResolver {

    private static final Logger LOGGER = LoggerFactory.getLogger(RedirectChainResolver.class);

    private static final int MAX_HOPS = 10;
    private static final int TIMEOUT_MS = 5000;

    /** Domains that are URL shorteners or redirect services. */
    private static final Set<String> SHORTENER_DOMAINS = Set.of(
        "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
        "is.gd", "buff.ly", "rb.gy", "cutt.ly", "short.io",
        "tiny.cc", "surl.li", "shorturl.at", "v.gd", "rebrand.ly",
        "bl.ink", "lnkd.in", "aka.ms"
    );

    /** Pattern to extract the target URL from Google redirect URLs. */
    private static final Pattern GOOGLE_REDIRECT_PATTERN =
        Pattern.compile("[?&](?:q|url|dest|continue)=([^&]+)", Pattern.CASE_INSENSITIVE);

    /** Pattern to extract the target URL from Salesforce click-tracking URLs. */
    private static final Pattern SALESFORCE_LINK_PATTERN =
        Pattern.compile("[?&](?:redirect|redirectUrl|url|u)=([^&]+)", Pattern.CASE_INSENSITIVE);

    /**
     * Resolves the full redirect chain starting from the given URL.
     *
     * @param startUrl the initial URL to resolve
     * @return the redirect chain result
     */
    public RedirectChain resolve(String startUrl) {
        List<String> chain = new ArrayList<>();
        chain.add(startUrl);

        String current = startUrl;
        for (int hop = 0; hop < MAX_HOPS; hop++) {
            String next = followOneHop(current);
            if (next == null || next.equals(current)) {
                break; // no more redirects
            }
            chain.add(next);
            current = next;
        }

        return new RedirectChain(
            Collections.unmodifiableList(chain),
            chain.get(chain.size() - 1),
            chain.size() - 1
        );
    }

    /**
     * Attempts to follow one redirect hop. First checks for URL-parameter-based
     * redirects (Google, Salesforce), then follows HTTP 3xx redirects.
     */
    private String followOneHop(String url) {
        // 1. Try extracting embedded URL from known redirect patterns
        String extracted = extractEmbeddedUrl(url);
        if (extracted != null) {
            return extracted;
        }

        // 2. Follow HTTP redirect
        return followHttpRedirect(url);
    }

    /**
     * Extracts the real destination URL from known redirect/tracking URL patterns
     * without making an HTTP request.
     */
    private String extractEmbeddedUrl(String url) {
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            if (host == null) return null;
            host = host.toLowerCase();
            String fullUrl = uri.toString();

            // Google redirects: google.com/url?q=...
            if (host.contains("google.com") && uri.getPath() != null && uri.getPath().contains("/url")) {
                return extractParamUrl(fullUrl, GOOGLE_REDIRECT_PATTERN);
            }

            // Firebase Dynamic Links: *.page.link, *.app.goo.gl
            if (host.endsWith(".page.link") || host.endsWith(".app.goo.gl")) {
                String linkParam = extractQueryParam(fullUrl, "link");
                if (linkParam != null) return linkParam;
                // Firebase links often have the URL in the "link" param, but if not,
                // fall through to HTTP redirect
            }

            // Salesforce click tracking
            if (host.contains("salesforce.com") || host.contains("exacttarget.com") || host.contains("sfmc")) {
                return extractParamUrl(fullUrl, SALESFORCE_LINK_PATTERN);
            }

            // Microsoft Safe Links: safelinks.protection.outlook.com
            if (host.contains("safelinks.protection.outlook.com")) {
                String urlParam = extractQueryParam(fullUrl, "url");
                if (urlParam != null) return urlParam;
            }

        } catch (Exception exception) {
            LOGGER.debug("Failed to parse URL for embedded extraction: {}", url);
        }
        return null;
    }

    /**
     * Follows an HTTP redirect by making a HEAD request with redirects disabled.
     */
    private String followHttpRedirect(String url) {
        try {
            URI uri = URI.create(url);
            URL urlObj = uri.toURL();
            HttpURLConnection connection = (HttpURLConnection) urlObj.openConnection();
            connection.setRequestMethod("HEAD");
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            connection.setRequestProperty("User-Agent", "Mozilla/5.0 (compatible; PhishingScanner/1.0)");

            int status = connection.getResponseCode();
            connection.disconnect();

            if (status >= 300 && status < 400) {
                String location = connection.getHeaderField("Location");
                if (location != null && !location.isBlank()) {
                    // Handle relative redirects
                    if (location.startsWith("/")) {
                        location = uri.getScheme() + "://" + uri.getHost()
                            + (uri.getPort() > 0 ? ":" + uri.getPort() : "")
                            + location;
                    }
                    return location;
                }
            }
        } catch (Exception exception) {
            LOGGER.debug("Failed to follow HTTP redirect for {}: {}", url, exception.getMessage());
        }
        return null;
    }

    /**
     * Extracts a URL from query parameters using a regex pattern.
     */
    private String extractParamUrl(String fullUrl, Pattern pattern) {
        Matcher matcher = pattern.matcher(fullUrl);
        if (matcher.find()) {
            try {
                return URLDecoder.decode(matcher.group(1), StandardCharsets.UTF_8);
            } catch (Exception e) {
                return matcher.group(1);
            }
        }
        return null;
    }

    /**
     * Extracts a specific query parameter value from a URL.
     */
    private String extractQueryParam(String fullUrl, String paramName) {
        try {
            URI uri = URI.create(fullUrl);
            String query = uri.getQuery();
            if (query == null) return null;
            for (String pair : query.split("&")) {
                String[] kv = pair.split("=", 2);
                if (kv.length == 2 && kv[0].equalsIgnoreCase(paramName)) {
                    return URLDecoder.decode(kv[1], StandardCharsets.UTF_8);
                }
            }
        } catch (Exception e) {
            LOGGER.debug("Failed to extract query param '{}' from: {}", paramName, fullUrl);
        }
        return null;
    }

    /**
     * Checks if the given domain is a known URL shortener.
     */
    public static boolean isKnownShortener(String domain) {
        if (domain == null) return false;
        String lower = domain.toLowerCase();
        return SHORTENER_DOMAINS.contains(lower);
    }

    // ── Result types ──

    /**
     * Represents the result of resolving a redirect chain.
     *
     * @param chain    the full list of URLs from start to final destination
     * @param finalUrl the last URL in the chain (the actual destination)
     * @param hopCount the number of redirects followed
     */
    public record RedirectChain(
        List<String> chain,
        String finalUrl,
        int hopCount
    ) {
        /** Returns true if any redirects were followed. */
        public boolean wasRedirected() {
            return hopCount > 0;
        }
    }
}
