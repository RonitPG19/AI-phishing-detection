package com.phishing.scanner_app.service;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.phishing.scanner_app.dto.CachedScanPayload;
import com.phishing.scanner_app.dto.CursorPageResponse;
import com.phishing.scanner_app.dto.HistoryItemResponse;
import com.phishing.scanner_app.dto.HistoryRequestSummary;
import com.phishing.scanner_app.exception.AccessDeniedException;
import com.phishing.scanner_app.exception.PersistenceUnavailableException;
import com.phishing.scanner_app.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class FirestoreScanHistoryService {

    private static final Logger LOGGER = LoggerFactory.getLogger(FirestoreScanHistoryService.class);
    private static final String COLLECTION = "user_scan_history";

    private final Firestore firestore;
    private final ScanResponseMapper responseMapper;
    private final int maxPageSize;

    public FirestoreScanHistoryService(
        ObjectProvider<Firestore> firestoreProvider,
        ScanResponseMapper responseMapper,
        @Value("${scanning.history.max-page-size:50}") int maxPageSize
    ) {
        this.firestore = firestoreProvider.getIfAvailable();
        this.responseMapper = responseMapper;
        this.maxPageSize = maxPageSize;
    }

    public String saveHistory(String userId, String reportId, String cacheKey, String responseSource,
                              CachedScanPayload payload, Instant requestedAt) {
        if (firestore == null) {
            return null;
        }

        try {
            HistoryRequestSummary summary = responseMapper.toRequestSummary(payload);
            Map<String, Object> document = new LinkedHashMap<>();
            document.put("userId", userId);
            document.put("reportId", reportId);
            document.put("cacheKey", cacheKey);
            document.put("responseSource", responseSource);
            document.put("requestedAt", requestedAt.toString());
            document.put("deletedAt", null);
            document.put("requestSummary", Map.of(
                "sender", summary.sender(),
                "subjectSnippet", summary.subjectSnippet(),
                "urlCount", summary.urlCount()
            ));
            document.put("overallRiskScore", payload.overallRiskScore());
            document.put("sender", payload.sender());
            document.put("subject", payload.subject());
            document.put("urlCount", payload.urlCount());

            return firestore.collection(COLLECTION).add(document).get().getId();
        } catch (Exception exception) {
            LOGGER.warn("Failed to save user scan history: {}", exception.getMessage());
            LOGGER.debug("User scan history write error details", exception);
            return null;
        }
    }

    public CursorPageResponse<HistoryItemResponse> listHistory(String userId, int limit, String cursor) {
        ensureAvailable();
        int effectiveLimit = Math.clamp(limit, 1, maxPageSize);

        try {
            Query query = firestore.collection(COLLECTION)
                .whereEqualTo("userId", userId)
                .whereEqualTo("deletedAt", null);

            if (cursor != null && !cursor.isBlank()) {
                query = query.whereLessThan("requestedAt", decodeCursor(cursor));
            }

            List<QueryDocumentSnapshot> documents = query
                .orderBy("requestedAt", Query.Direction.DESCENDING)
                .limit((int) (effectiveLimit + 1L))
                .get()
                .get()
                .getDocuments();

            List<HistoryItemResponse> items = new ArrayList<>();
            for (int index = 0; index < Math.min(documents.size(), effectiveLimit); index++) {
                items.add(toHistoryItem(documents.get(index)));
            }

            String nextCursor = null;
            if (documents.size() > effectiveLimit) {
                nextCursor = encodeCursor(documents.get(effectiveLimit - 1).getString("requestedAt"));
            }

            return new CursorPageResponse<>(items, nextCursor);
        } catch (Exception exception) {
            throw new PersistenceUnavailableException("Unable to read scan history");
        }
    }

    public HistoryItemResponse getHistory(String userId, String historyId) {
        ensureAvailable();

        try {
            DocumentSnapshot snapshot = firestore.collection(COLLECTION).document(historyId).get().get();
            if (!snapshot.exists() || snapshot.getString("deletedAt") != null) {
                throw new ResourceNotFoundException("History item not found");
            }
            if (!userId.equals(snapshot.getString("userId"))) {
                throw new AccessDeniedException("You do not have access to this history item");
            }
            return toHistoryItem(snapshot);
        } catch (ResourceNotFoundException | AccessDeniedException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new PersistenceUnavailableException("Unable to read scan history");
        }
    }

    public void softDelete(String userId, String historyId) {
        ensureAvailable();

        try {
            DocumentSnapshot snapshot = firestore.collection(COLLECTION).document(historyId).get().get();
            if (!snapshot.exists() || snapshot.getString("deletedAt") != null) {
                throw new ResourceNotFoundException("History item not found");
            }
            if (!userId.equals(snapshot.getString("userId"))) {
                throw new AccessDeniedException("You do not have access to delete this history item");
            }

            firestore.collection(COLLECTION).document(historyId)
                .update("deletedAt", Instant.now().toString())
                .get();
        } catch (ResourceNotFoundException | AccessDeniedException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new PersistenceUnavailableException("Unable to delete scan history");
        }
    }

    private void ensureAvailable() {
        if (firestore == null) {
            throw new PersistenceUnavailableException("Scan history is unavailable because Firestore is disabled");
        }
    }

    private HistoryItemResponse toHistoryItem(DocumentSnapshot snapshot) {
        @SuppressWarnings("unchecked")
        Map<String, Object> summaryMap = (Map<String, Object>) snapshot.get("requestSummary");
        HistoryRequestSummary summary = new HistoryRequestSummary(
            summaryMap == null ? null : (String) summaryMap.get("sender"),
            summaryMap == null ? null : (String) summaryMap.get("subjectSnippet"),
            summaryMap == null || summaryMap.get("urlCount") == null ? 0 : ((Number) summaryMap.get("urlCount")).intValue()
        );

        Number riskScore = (Number) snapshot.get("overallRiskScore");
        Number urlCount = (Number) snapshot.get("urlCount");
        return new HistoryItemResponse(
            snapshot.getId(),
            snapshot.getString("reportId"),
            snapshot.getString("cacheKey"),
            snapshot.getString("responseSource"),
            snapshot.getString("requestedAt"),
            summary,
            riskScore == null ? 0 : riskScore.intValue(),
            snapshot.getString("sender"),
            snapshot.getString("subject"),
            urlCount == null ? 0 : urlCount.intValue()
        );
    }

    private String encodeCursor(String requestedAt) {
        return Base64.getUrlEncoder().withoutPadding()
            .encodeToString(requestedAt.getBytes(StandardCharsets.UTF_8));
    }

    private String decodeCursor(String cursor) {
        return new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
    }
}
