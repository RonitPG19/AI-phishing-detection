package com.phishing.scanner_app.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.phishing.scanner_app.dto.EmailRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.IDN;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Pattern;

@Service
public class ScanFingerprintService {

    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private final ObjectMapper objectMapper;
    private final String cacheVersion;

    public ScanFingerprintService(ObjectMapper objectMapper, @Value("${scanning.cache.version:v1}") String cacheVersion) {
        this.objectMapper = objectMapper;
        this.cacheVersion = cacheVersion;
    }

    public String cacheVersion() {
        return cacheVersion;
    }

    public String canonicalPayload(EmailRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("cacheVersion", cacheVersion);
        payload.put("sourceType", request.hasBodyContent() ? "full_email" : "link_only");
        payload.put("subject", normalizeText(request.getSubject()));
        payload.put("from", normalizeEmail(request.getFrom()));
        payload.put("bodyHtml", normalizeText(request.getBodyHtml()));
        payload.put("bodyText", normalizeText(request.getBodyText()));
        payload.put("headers", normalizeHeaders(request.getHeaders()));
        payload.put("links", normalizeLinks(request.getLinks()));

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize canonical scan payload", exception);
        }
    }

    public String cacheKey(EmailRequest request) {
        return cacheKeyFromCanonicalPayload(canonicalPayload(request));
    }

    public String cacheKeyFromCanonicalPayload(String canonicalPayload) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(canonicalPayload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to compute scan cache key", exception);
        }
    }

    private String normalizeText(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return WHITESPACE.matcher(value.trim()).replaceAll(" ");
    }

    private String normalizeEmail(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private Map<String, List<String>> normalizeHeaders(Map<String, List<String>> headers) {
        if (headers == null || headers.isEmpty()) {
            return Map.of();
        }
        Map<String, List<String>> normalized = new TreeMap<>();
        for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
            String key = entry.getKey() == null ? "" : entry.getKey().trim().toLowerCase(Locale.ROOT);
            List<String> values = entry.getValue() == null ? List.of() : entry.getValue().stream()
                .map(this::normalizeText)
                .sorted()
                .toList();
            normalized.put(key, values);
        }
        return normalized;
    }

    private List<Map<String, String>> normalizeLinks(List<EmailRequest.LinkItem> links) {
        if (links == null || links.isEmpty()) {
            return List.of();
        }
        List<Map<String, String>> normalized = new ArrayList<>();
        for (EmailRequest.LinkItem link : links) {
            Map<String, String> mapped = new LinkedHashMap<>();
            mapped.put("href", normalizeUrl(link.getHref()));
            mapped.put("text", normalizeText(link.getText()));
            normalized.add(mapped);
        }
        normalized.sort(Comparator.comparing((Map<String, String> entry) -> entry.getOrDefault("href", ""))
            .thenComparing(entry -> entry.getOrDefault("text", "")));
        return normalized;
    }

    private String normalizeUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return "";
        }

        String trimmed = rawUrl.trim();
        try {
            URI uri = URI.create(trimmed);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            String path = uri.getPath();
            String query = uri.getQuery();
            String fragment = uri.getFragment();

            StringBuilder builder = new StringBuilder();
            if (scheme != null) {
                builder.append(scheme.toLowerCase(Locale.ROOT)).append("://");
            }
            if (host != null) {
                builder.append(IDN.toASCII(host.toLowerCase(Locale.ROOT)));
            }
            if (uri.getPort() != -1) {
                builder.append(":").append(uri.getPort());
            }
            if (path != null) {
                builder.append(path);
            }
            if (query != null) {
                builder.append("?").append(query);
            }
            if (fragment != null) {
                builder.append("#").append(fragment);
            }
            return builder.toString();
        } catch (Exception ignored) {
            return trimmed.toLowerCase(Locale.ROOT);
        }
    }
}
