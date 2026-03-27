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

    private final Firestore firestore;
    private final String collectionName;

    public FirestoreReportService(
        ObjectProvider<Firestore> firestoreProvider,
        @Value("${firebase.firestore.collection:phishingReports}") String collectionName
    ) {
        this.firestore = firestoreProvider.getIfAvailable();
        this.collectionName = collectionName;
    }

    public String savePhishingReport(EmailRequest request, PhishingScannerService.EmailScanReport report) {
        if (firestore == null) {
            LOGGER.debug("Skipping Firestore write because Firebase is not enabled");
            return null;
        }

        try {
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
            document.put("findings", mapFindings(report.findings()));

            DocumentReference ref = firestore.collection(collectionName).add(document).get();
            return ref.getId();
        } catch (Exception exception) {
            LOGGER.warn("Failed to save phishing report in Firestore: {}", exception.getMessage());
            return null;
        }
    }

    /**
     * Retrieves a single report by its Firestore document ID.
     */
    public Map<String, Object> getReport(String id) {
        if (firestore == null) {
            LOGGER.debug("Skipping Firestore read because Firebase is not enabled");
            return null;
        }

        try {
            DocumentSnapshot snapshot = firestore.collection(collectionName).document(id).get().get();
            if (!snapshot.exists()) {
                return null;
            }
            Map<String, Object> data = new LinkedHashMap<>(snapshot.getData());
            data.put("id", snapshot.getId());
            return data;
        } catch (Exception exception) {
            LOGGER.warn("Failed to read phishing report from Firestore: {}", exception.getMessage());
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
            List<QueryDocumentSnapshot> documents = firestore.collection(collectionName)
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
}
