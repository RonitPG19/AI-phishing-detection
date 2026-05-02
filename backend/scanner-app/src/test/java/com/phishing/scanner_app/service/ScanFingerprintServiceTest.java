package com.phishing.scanner_app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.phishing.scanner_app.dto.EmailRequest;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

class ScanFingerprintServiceTest {

    private final ScanFingerprintService fingerprintService =
        new ScanFingerprintService(new ObjectMapper(), "v1");

    // ── Canonicalization produces same cacheKey for equivalent requests ──

    @Test
    void equivalentRequestsProduceSameCacheKey() {
        EmailRequest first = buildRequest(
            "  Account   Alert ",
            "USER@Example.com",
            " Click   here ",
            Map.of("Subject", List.of(" Alert "), "X-Test", List.of(" one ", "two"))
        );
        EmailRequest second = buildRequest(
            "Account Alert",
            "user@example.com",
            "Click here",
            Map.of("x-test", List.of("two", "one"), "subject", List.of("Alert"))
        );

        assertEquals(fingerprintService.cacheKey(first), fingerprintService.cacheKey(second));
    }

    @Test
    void emailCaseNormalizationProducesSameKey() {
        EmailRequest upper = buildRequest("Test", "USER@EXAMPLE.COM", "body", Map.of());
        EmailRequest lower = buildRequest("Test", "user@example.com", "body", Map.of());

        assertEquals(fingerprintService.cacheKey(upper), fingerprintService.cacheKey(lower));
    }

    @Test
    void headerNormalizationSortsKeysAndValues() {
        EmailRequest first = buildRequest("Test", "u@e.com", "body",
            Map.of("Z-Header", List.of("b", "a"), "A-Header", List.of("x")));
        EmailRequest second = buildRequest("Test", "u@e.com", "body",
            Map.of("a-header", List.of("x"), "z-header", List.of("a", "b")));

        assertEquals(fingerprintService.cacheKey(first), fingerprintService.cacheKey(second));
    }

    @Test
    void linkOrderDoesNotAffectCacheKey() {
        EmailRequest.LinkItem link1 = new EmailRequest.LinkItem();
        link1.setHref("https://example.com/a");
        link1.setText("First");
        EmailRequest.LinkItem link2 = new EmailRequest.LinkItem();
        link2.setHref("https://example.com/b");
        link2.setText("Second");

        EmailRequest first = new EmailRequest();
        first.setSubject("Test");
        first.setFrom("user@example.com");
        first.setLinks(List.of(link1, link2));

        EmailRequest second = new EmailRequest();
        second.setSubject("Test");
        second.setFrom("user@example.com");
        second.setLinks(List.of(link2, link1));

        assertEquals(fingerprintService.cacheKey(first), fingerprintService.cacheKey(second));
    }

    @Test
    void urlNormalizationHandlesPortsAndUppercaseHost() {
        EmailRequest.LinkItem link1 = new EmailRequest.LinkItem();
        link1.setHref("HTTPS://EXAMPLE.COM:443/path?q=1#frag");
        EmailRequest.LinkItem link2 = new EmailRequest.LinkItem();
        link2.setHref("https://example.com:443/path?q=1#frag");

        EmailRequest first = new EmailRequest();
        first.setLinks(List.of(link1));
        EmailRequest second = new EmailRequest();
        second.setLinks(List.of(link2));

        assertEquals(fingerprintService.cacheKey(first), fingerprintService.cacheKey(second));
    }

    // ── Source type prevents body/link-only collision ──

    @Test
    void sourceTypePreventsBodyAndLinkOnlyCollision() {
        EmailRequest bodyRequest = buildRequest("Subject", "user@example.com", "Body content", Map.of());

        EmailRequest linkOnlyRequest = new EmailRequest();
        linkOnlyRequest.setSubject("Subject");
        linkOnlyRequest.setFrom("user@example.com");
        EmailRequest.LinkItem linkItem = new EmailRequest.LinkItem();
        linkItem.setHref("https://example.com");
        linkOnlyRequest.setLinks(List.of(linkItem));

        assertNotEquals(fingerprintService.cacheKey(bodyRequest), fingerprintService.cacheKey(linkOnlyRequest));
    }

    // ── Null/empty fields produce stable output ──

    @Test
    void nullFieldsProduceStableFingerprint() {
        EmailRequest first = new EmailRequest();
        EmailRequest second = new EmailRequest();

        assertEquals(fingerprintService.cacheKey(first), fingerprintService.cacheKey(second));
    }

    // ── cacheVersion is included and affects hash ──

    @Test
    void differentCacheVersionProducesDifferentKey() {
        ScanFingerprintService v2Service = new ScanFingerprintService(new ObjectMapper(), "v2");
        EmailRequest request = buildRequest("Subject", "u@e.com", "Body", Map.of());

        assertNotEquals(fingerprintService.cacheKey(request), v2Service.cacheKey(request));
    }

    @Test
    void cacheVersionReturnsConfiguredVersion() {
        assertEquals("v1", fingerprintService.cacheVersion());
    }

    // ── cacheKeyFromCanonicalPayload is deterministic ──

    @Test
    void cacheKeyFromCanonicalPayloadIsDeterministic() {
        String payload = "{\"test\":\"data\"}";
        String key1 = fingerprintService.cacheKeyFromCanonicalPayload(payload);
        String key2 = fingerprintService.cacheKeyFromCanonicalPayload(payload);

        assertEquals(key1, key2);
        assertFalse(key1.isEmpty());
    }

    private EmailRequest buildRequest(String subject, String from, String bodyText, Map<String, List<String>> headers) {
        EmailRequest request = new EmailRequest();
        request.setSubject(subject);
        request.setFrom(from);
        request.setBodyText(bodyText);
        request.setHeaders(headers);
        return request;
    }
}
