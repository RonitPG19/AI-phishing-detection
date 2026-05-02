package com.phishing.scanner_app.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.phishing.scanner_app.dto.CachedScanPayload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class FirestoreScanCacheService {

    private static final Logger LOGGER = LoggerFactory.getLogger(FirestoreScanCacheService.class);
    private static final String COLLECTION = "scan_cache";

    private final Firestore firestore;
    private final ObjectMapper objectMapper;

    public FirestoreScanCacheService(ObjectProvider<Firestore> firestoreProvider, ObjectMapper objectMapper) {
        this.firestore = firestoreProvider.getIfAvailable();
        this.objectMapper = objectMapper;
    }

    public Optional<ScanCacheEntry> get(String cacheKey) {
        if (firestore == null) {
            return Optional.empty();
        }

        try {
            DocumentSnapshot snapshot = firestore.collection(COLLECTION).document(cacheKey).get().get();
            if (!snapshot.exists()) {
                return Optional.empty();
            }

            String expiresAt = snapshot.getString("expiresAt");
            if (expiresAt == null || Instant.parse(expiresAt).isBefore(Instant.now())) {
                return Optional.empty();
            }

            Object rawPayload = snapshot.get("reportSnapshot");
            CachedScanPayload payload = objectMapper.convertValue(rawPayload, CachedScanPayload.class);
            return Optional.of(new ScanCacheEntry(
                cacheKey,
                payload,
                snapshot.getString("reportStorageRef"),
                expiresAt
            ));
        } catch (Exception exception) {
            LOGGER.warn("Failed to read scan cache entry {}: {}", cacheKey, exception.getMessage());
            LOGGER.debug("Scan cache read error details", exception);
            return Optional.empty();
        }
    }

    public void save(String cacheKey, String requestFingerprint, String cacheVersion, String sourceType,
                     CachedScanPayload payload, String reportStorageRef, String expiresAt) {
        if (firestore == null) {
            return;
        }

        try {
            String now = Instant.now().toString();
            Map<String, Object> document = new LinkedHashMap<>();
            document.put("cacheVersion", cacheVersion);
            document.put("requestFingerprint", requestFingerprint);
            document.put("reportSnapshot", objectMapper.convertValue(payload, new TypeReference<Map<String, Object>>() {}));
            document.put("reportStorageRef", reportStorageRef);
            document.put("overallRiskScore", payload.overallRiskScore());
            document.put("createdAt", now);
            document.put("expiresAt", expiresAt);
            document.put("lastServedAt", now);
            document.put("servedCount", 1L);
            document.put("sourceType", sourceType);

            firestore.collection(COLLECTION).document(cacheKey).set(document).get();
        } catch (Exception exception) {
            LOGGER.warn("Failed to save scan cache entry {}: {}", cacheKey, exception.getMessage());
            LOGGER.debug("Scan cache write error details", exception);
        }
    }

    public void recordCacheHit(String cacheKey) {
        if (firestore == null) {
            return;
        }

        try {
            DocumentSnapshot snapshot = firestore.collection(COLLECTION).document(cacheKey).get().get();
            if (!snapshot.exists()) {
                return;
            }

            long servedCount = snapshot.contains("servedCount") ? snapshot.getLong("servedCount") : 0L;
            Map<String, Object> updates = Map.of(
                "servedCount", servedCount + 1,
                "lastServedAt", Instant.now().toString()
            );
            firestore.collection(COLLECTION).document(cacheKey).update(updates).get();
        } catch (Exception exception) {
            LOGGER.warn("Failed to update cache hit metrics for {}: {}", cacheKey, exception.getMessage());
            LOGGER.debug("Scan cache update error details", exception);
        }
    }

    public record ScanCacheEntry(
        String cacheKey,
        CachedScanPayload payload,
        String reportStorageRef,
        String expiresAt
    ) {
    }
}
