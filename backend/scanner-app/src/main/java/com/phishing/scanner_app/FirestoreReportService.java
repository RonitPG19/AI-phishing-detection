package com.phishing.scanner_app;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class FirestoreReportService {

    private static final Logger LOGGER = LoggerFactory.getLogger(FirestoreReportService.class);
    private static final int MAX_RETRIES = 3;
    private static final int RETRY_DELAY_MS = 500;

    private final Firestore firestore;
    private final String collectionName;
    private final int firestoreTimeoutSeconds;

    public FirestoreReportService(
        ObjectProvider<Firestore> firestoreProvider,
        @Value("${firebase.firestore.collection:phishingReports}") String collectionName,
        @Value("${firebase.firestore.timeout.seconds:30}") int firestoreTimeoutSeconds
    ) {
        this.firestore = firestoreProvider.getIfAvailable();
        this.collectionName = collectionName;
        this.firestoreTimeoutSeconds = firestoreTimeoutSeconds;
    }

    public String savePhishingReport(EmailRequest request, PhishingScannerService.EmailScanReport report) {
        if (firestore == null) {
            LOGGER.debug("Skipping Firestore write because Firebase is not enabled");
            return null;
        }

        try {
            return saveWithRetry(request, report);
        } catch (Exception exception) {
            LOGGER.warn("Failed to save phishing report in Firestore after {} retries: {}", 
                MAX_RETRIES, exception.getMessage());
            LOGGER.debug("Firestore error details:", exception);
            return null;
        }
    }

    private String saveWithRetry(EmailRequest request, PhishingScannerService.EmailScanReport report) throws Exception {
        Exception lastException = null;
        
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                Map<String, Object> document = buildDocument(request, report);
                DocumentReference ref = firestore.collection(java.util.Objects.requireNonNull(collectionName)).add(document).get();
                LOGGER.debug("Successfully saved phishing report to Firestore: {}", ref.getId());
                return ref.getId();
            } catch (Exception exception) {
                lastException = exception;
                if (attempt < MAX_RETRIES) {
                    long delayMs = RETRY_DELAY_MS * (long) Math.pow(2, attempt - 1);
                    LOGGER.debug("Firestore write attempt {} failed: {}. Retrying in {}ms...", 
                        attempt, exception.getMessage(), delayMs);
                    Thread.sleep(delayMs);
                } else {
                    LOGGER.warn("Firestore write attempt {} failed: {} (final attempt)", 
                        attempt, exception.getMessage());
                }
            }
        }
        
        throw lastException;
    }

    private Map<String, Object> buildDocument(EmailRequest request, PhishingScannerService.EmailScanReport report) {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("savedAt", Instant.now().toString());
        document.put("from", request.getFrom());
        document.put("subject", report.subject());
        document.put("sender", report.sender());
        document.put("urlCount", report.urlCount());
        document.put("overallRiskScore", report.overallRiskScore());
        document.put("headerInspectionResult", Map.of(
            "spfFail", report.headerInspectionResult().spfFail,
            "dkimFail", report.headerInspectionResult().dkimFail,
            "dmarcFail", report.headerInspectionResult().dmarcFail,
            "displayNameMismatch", report.headerInspectionResult().displayNameMismatch,
            "replyToMismatch", report.headerInspectionResult().replyToMismatch
        ));
        
        if (report.sections() != null) {
            Map<String, Object> sectionsMap = new LinkedHashMap<>();
            sectionsMap.put("Header", mapCategory(report.sections().header()));
            sectionsMap.put("Subject", mapCategory(report.sections().subject()));
            sectionsMap.put("Body", mapCategory(report.sections().body()));
            sectionsMap.put("Links", mapCategory(report.sections().links()));
            document.put("sections", sectionsMap);
        }

        // Persist AI analysis if available
        if (report.aiAnalysis() != null) {
            Map<String, Object> aiData = new LinkedHashMap<>();
            aiData.put("phishingLikelihood", report.aiAnalysis().phishingLikelihood);
            aiData.put("summary", report.aiAnalysis().summary);
            if (report.aiAnalysis().indicators != null) {
                List<Map<String, String>> indicators = report.aiAnalysis().indicators.stream()
                    .map(ind -> Map.of(
                        "indicator", ind.indicator != null ? ind.indicator : "",
                        "description", ind.description != null ? ind.description : "",
                        "severity", ind.severity != null ? ind.severity : "LOW"
                    ))
                    .toList();
                aiData.put("indicators", indicators);
            }
            document.put("aiAnalysis", aiData);
        }
        
        return document;
    }
    public Map<String, Object> getReport(String id) {
        if (firestore == null) {
            LOGGER.debug("Skipping Firestore read because Firebase is not enabled");
            return null;
        }

        try {
            DocumentSnapshot snapshot = firestore.collection(java.util.Objects.requireNonNull(collectionName)).document(id).get().get();
            if (!snapshot.exists()) {
                return null;
            }
            Map<String, Object> data = new LinkedHashMap<>(snapshot.getData());
            data.put("id", snapshot.getId());
            return data;
        } catch (Exception exception) {
            LOGGER.warn("Failed to read phishing report from Firestore: {}", exception.getMessage());
            LOGGER.debug("Firestore read error details:", exception);
            return null;
        }
    }

    /**
     * Lists the most recent reports, ordered by savedAt descending.
     */
    public List<Map<String, Object>> listReports(int limit) {
        if (firestore == null) {
            LOGGER.debug("Skipping Firestore read because Firebase is not enabled");
            return List.of();
        }

        try {
            List<QueryDocumentSnapshot> documents = firestore.collection(java.util.Objects.requireNonNull(collectionName))
                .orderBy("savedAt", Query.Direction.DESCENDING)
                .limit(limit)
                .get()
                .get()
                .getDocuments();

            List<Map<String, Object>> results = new ArrayList<>();
            for (QueryDocumentSnapshot doc : documents) {
                Map<String, Object> data = new LinkedHashMap<>(doc.getData());
                data.put("id", doc.getId());
                results.add(data);
            }
            return results;
        } catch (Exception exception) {
            LOGGER.warn("Failed to list phishing reports from Firestore: {}", exception.getMessage());
            LOGGER.debug("Firestore list error details:", exception);
            return List.of();
        }
    }

    private List<Map<String, Object>> mapFindings(List<PhishingScannerService.RiskFinding> findings) {
        return findings.stream()
            .map(finding -> {
                Map<String, Object> mapped = new LinkedHashMap<>();
                mapped.put("target", finding.target());
                mapped.put("description", finding.description());
                mapped.put("severity", finding.severity().name());
                mapped.put("scoreContribution", finding.scoreContribution());
                return mapped;
            })
            .toList();
    }

    private Map<String, Object> mapCategory(PhishingScannerService.CategoryResult category) {
        Map<String, Object> mapped = new LinkedHashMap<>();
        mapped.put("findings", mapFindings(category.findings()));
        mapped.put("scoreBreakdown", category.scoreBreakdown());
        return mapped;
    }
}
