package com.phishing.scanner_app.service;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.phishing.scanner_app.dto.CreateFlagRequest;
import com.phishing.scanner_app.dto.CursorPageResponse;
import com.phishing.scanner_app.dto.FlagResponse;
import com.phishing.scanner_app.exception.ConflictException;
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
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class FirestoreScanFlagService {

    private static final Logger LOGGER = LoggerFactory.getLogger(FirestoreScanFlagService.class);
    private static final String COLLECTION = "scan_flags";

    private final Firestore firestore;
    private final FirestoreReportService firestoreReportService;
    private final int maxCommentLength;

    public FirestoreScanFlagService(
        ObjectProvider<Firestore> firestoreProvider,
        FirestoreReportService firestoreReportService,
        @Value("${scanning.flags.max-comment-length:500}") int maxCommentLength
    ) {
        this.firestore = firestoreProvider.getIfAvailable();
        this.firestoreReportService = firestoreReportService;
        this.maxCommentLength = maxCommentLength;
    }

    public FlagResponse createReportFlag(String userId, String reportId, CreateFlagRequest request) {
        return createFlag(userId, reportId, null, "report", request);
    }

    public FlagResponse createFindingFlag(String userId, String reportId, String findingId, CreateFlagRequest request) {
        return createFlag(userId, reportId, findingId, "finding", request);
    }

    public CursorPageResponse<FlagResponse> listMine(String userId, int limit, String cursor) {
        ensureAvailable();
        int effectiveLimit = Math.clamp(limit, 1, 50);

        try {
            String cursorTimestamp = cursor == null || cursor.isBlank() ? null : decodeCursor(cursor);
            List<QueryDocumentSnapshot> documents = firestore.collection(COLLECTION)
                .whereEqualTo("userId", userId)
                .get()
                .get()
                .getDocuments()
                .stream()
                .filter(document -> cursorTimestamp == null || nullToEmpty(document.getString("createdAt")).compareTo(cursorTimestamp) < 0)
                .sorted(Comparator.comparing(
                    (QueryDocumentSnapshot document) -> nullToEmpty(document.getString("createdAt"))
                ).reversed())
                .limit((long) effectiveLimit + 1L)
                .toList();

            List<FlagResponse> items = new ArrayList<>();
            for (int index = 0; index < Math.min(documents.size(), effectiveLimit); index++) {
                items.add(toFlagResponse(documents.get(index)));
            }

            String nextCursor = null;
            if (documents.size() > effectiveLimit) {
                nextCursor = encodeCursor(documents.get(effectiveLimit - 1).getString("createdAt"));
            }

            return new CursorPageResponse<>(items, nextCursor);
        } catch (Exception exception) {
            throw new PersistenceUnavailableException("Unable to list scan flags");
        }
    }

    private FlagResponse createFlag(String userId, String reportId, String findingId, String flagType, CreateFlagRequest request) {
        ensureAvailable();
        validateComment(request.getComment());

        Map<String, Object> report = firestoreReportService.getReport(reportId);
        if (report == null) {
            throw new ResourceNotFoundException("Report not found");
        }

        if (findingId != null && !reportContainsFinding(report, findingId)) {
            throw new ResourceNotFoundException("Finding not found in report");
        }

        rejectOpenDuplicate(userId, reportId, findingId, request.getReasonCode().name());

        try {
            String createdAt = Instant.now().toString();
            Map<String, Object> document = new LinkedHashMap<>();
            document.put("reportId", reportId);
            document.put("userId", userId);
            document.put("flagType", flagType);
            document.put("findingId", findingId);
            document.put("reasonCode", request.getReasonCode().name());
            document.put("comment", normalizeComment(request.getComment()));
            document.put("createdAt", createdAt);
            document.put("status", "open");

            String flagId = firestore.collection(COLLECTION).add(document).get().getId();
            return new FlagResponse(flagId, reportId, flagType, findingId, request.getReasonCode().name(),
                normalizeComment(request.getComment()), createdAt, "open");
        } catch (ResourceNotFoundException | ConflictException exception) {
            throw exception;
        } catch (Exception exception) {
            LOGGER.warn("Failed to create scan flag: {}", exception.getMessage());
            LOGGER.debug("Scan flag create error details", exception);
            throw new PersistenceUnavailableException("Unable to create scan flag");
        }
    }

    private void rejectOpenDuplicate(String userId, String reportId, String findingId, String reasonCode) {
        try {
            Query query = firestore.collection(COLLECTION)
                .whereEqualTo("userId", userId)
                .whereEqualTo("reportId", reportId)
                .whereEqualTo("findingId", findingId)
                .whereEqualTo("reasonCode", reasonCode)
                .whereEqualTo("status", "open")
                .limit(1);

            if (!query.get().get().isEmpty()) {
                throw new ConflictException("An open flag with this reason already exists");
            }
        } catch (ConflictException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new PersistenceUnavailableException("Unable to validate existing flags");
        }
    }

    private boolean reportContainsFinding(Map<String, Object> report, String findingId) {
        Object sectionsObject = report.get("sections");
        if (!(sectionsObject instanceof Map<?, ?> sections)) {
            return false;
        }

        for (Map.Entry<?, ?> entry : sections.entrySet()) {
            String categoryName = String.valueOf(entry.getKey()).toLowerCase();
            if (!(entry.getValue() instanceof Map<?, ?> categoryMap)) {
                continue;
            }
            Object findingsObject = categoryMap.get("findings");
            if (!(findingsObject instanceof List<?> findings)) {
                continue;
            }

            for (int index = 0; index < findings.size(); index++) {
                Object findingObject = findings.get(index);
                if (!(findingObject instanceof Map<?, ?> findingMap)) {
                    continue;
                }
                Object storedId = findingMap.get("id");
                String effectiveId = storedId == null
                    ? ScanResponseMapper.findingId(categoryName, index)
                    : String.valueOf(storedId);
                if (findingId.equals(effectiveId)) {
                    return true;
                }
            }
        }

        return false;
    }

    private void validateComment(String comment) {
        if (comment != null && comment.length() > maxCommentLength) {
            throw new ConflictException("Flag comment exceeds the maximum allowed length");
        }
    }

    private String normalizeComment(String comment) {
        if (comment == null || comment.isBlank()) {
            return null;
        }
        return comment.trim();
    }

    private void ensureAvailable() {
        if (firestore == null) {
            throw new PersistenceUnavailableException("Flagging is unavailable because Firestore is disabled");
        }
    }

    private FlagResponse toFlagResponse(DocumentSnapshot snapshot) {
        return new FlagResponse(
            snapshot.getId(),
            snapshot.getString("reportId"),
            snapshot.getString("flagType"),
            snapshot.getString("findingId"),
            snapshot.getString("reasonCode"),
            snapshot.getString("comment"),
            snapshot.getString("createdAt"),
            snapshot.getString("status")
        );
    }

    private String encodeCursor(String createdAt) {
        return Base64.getUrlEncoder().withoutPadding()
            .encodeToString(createdAt.getBytes(StandardCharsets.UTF_8));
    }

    private String decodeCursor(String cursor) {
        return new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
