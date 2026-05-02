package com.phishing.scanner_app.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QuerySnapshot;
import com.phishing.scanner_app.dto.CreateFlagRequest;
import com.phishing.scanner_app.dto.FlagResponse;
import com.phishing.scanner_app.dto.ScanFlagReasonCode;
import com.phishing.scanner_app.exception.ConflictException;
import com.phishing.scanner_app.exception.PersistenceUnavailableException;
import com.phishing.scanner_app.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@SuppressWarnings("unchecked")
class FirestoreScanFlagServiceTest {

    private static ObjectProvider<Firestore> providerOf(Firestore firestore) {
        ObjectProvider<Firestore> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(firestore);
        return provider;
    }

    // ── Firestore unavailable ──

    @Test
    void createReportFlagThrowsWhenFirestoreNull() {
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        FirestoreScanFlagService service = new FirestoreScanFlagService(providerOf(null), reportService, 500);

        assertThrows(PersistenceUnavailableException.class,
            () -> service.createReportFlag("user-1", "report-1", flagRequest(ScanFlagReasonCode.FALSE_POSITIVE, null)));
    }

    @Test
    void listMineThrowsWhenFirestoreNull() {
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        FirestoreScanFlagService service = new FirestoreScanFlagService(providerOf(null), reportService, 500);

        assertThrows(PersistenceUnavailableException.class,
            () -> service.listMine("user-1", 10, null));
    }

    // ── Report not found ──

    @Test
    void createReportFlagThrowsWhenReportNotFound() {
        Firestore firestore = mock(Firestore.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        when(reportService.getReport("report-1")).thenReturn(null);

        FirestoreScanFlagService service = new FirestoreScanFlagService(providerOf(firestore), reportService, 500);

        assertThrows(ResourceNotFoundException.class,
            () -> service.createReportFlag("user-1", "report-1", flagRequest(ScanFlagReasonCode.FALSE_POSITIVE, null)));
    }

    // ── Finding not found in stored report ──

    @Test
    void createFindingFlagThrowsWhenFindingNotInReport() {
        Firestore firestore = mock(Firestore.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        Map<String, Object> report = Map.of(
            "sections", Map.of(
                "Links", Map.of(
                    "findings", List.of(
                        Map.of("id", "links-1", "target", "https://example.com")
                    )
                )
            )
        );
        when(reportService.getReport("report-1")).thenReturn(report);

        FirestoreScanFlagService service = new FirestoreScanFlagService(providerOf(firestore), reportService, 500);

        assertThrows(ResourceNotFoundException.class,
            () -> service.createFindingFlag("user-1", "report-1", "nonexistent-finding",
                flagRequest(ScanFlagReasonCode.FALSE_POSITIVE, null)));
    }

    @Test
    void createFindingFlagThrowsWhenReportHasNoSections() {
        Firestore firestore = mock(Firestore.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        when(reportService.getReport("report-1")).thenReturn(Map.of("id", "report-1"));

        FirestoreScanFlagService service = new FirestoreScanFlagService(providerOf(firestore), reportService, 500);

        assertThrows(ResourceNotFoundException.class,
            () -> service.createFindingFlag("user-1", "report-1", "links-1",
                flagRequest(ScanFlagReasonCode.FALSE_POSITIVE, null)));
    }

    // ── Finding validation uses generated ID when no explicit ID ──

    @Test
    void findingValidationUsesGeneratedIdWhenNoExplicitId() throws Exception {
        Firestore firestore = mock(Firestore.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        // Finding without "id" field → generated id is "body-1" (category=Body, index=0)
        Map<String, Object> report = Map.of(
            "sections", Map.of(
                "Body", Map.of(
                    "findings", List.of(
                        Map.of("target", "some text", "description", "test desc")
                    )
                )
            )
        );
        when(reportService.getReport("report-1")).thenReturn(report);

        // Mock duplicate check to pass (no existing flags)
        mockDuplicateCheckPasses(firestore);
        // Mock document creation
        mockDocumentCreation(firestore, "flag-gen");

        FirestoreScanFlagService service = new FirestoreScanFlagService(providerOf(firestore), reportService, 500);

        // "body-1" should match the generated id for Body category, index 0
        FlagResponse response = service.createFindingFlag("user-1", "report-1", "body-1",
            flagRequest(ScanFlagReasonCode.MISCLASSIFIED, null));

        assertEquals("flag-gen", response.flagId());
        assertEquals("body-1", response.findingId());
    }

    // ── Duplicate flag rejection ──

    @Test
    void createFlagRejectsDuplicateOpenFlag() throws Exception {
        Firestore firestore = mock(Firestore.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        when(reportService.getReport("report-1")).thenReturn(Map.of("id", "report-1"));

        // Mock duplicate check to find existing flag
        CollectionReference collection = mock(CollectionReference.class);
        Query query = mock(Query.class);
        when(firestore.collection("scan_flags")).thenReturn(collection);
        when(collection.whereEqualTo(anyString(), any())).thenReturn(query);
        when(query.whereEqualTo(anyString(), any())).thenReturn(query);
        when(query.limit(anyInt())).thenReturn(query);

        ApiFuture<QuerySnapshot> queryFuture = mock(ApiFuture.class);
        QuerySnapshot querySnapshot = mock(QuerySnapshot.class);
        when(query.get()).thenReturn(queryFuture);
        when(queryFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.isEmpty()).thenReturn(false); // duplicate exists

        FirestoreScanFlagService service = new FirestoreScanFlagService(providerOf(firestore), reportService, 500);

        assertThrows(ConflictException.class,
            () -> service.createReportFlag("user-1", "report-1",
                flagRequest(ScanFlagReasonCode.FALSE_POSITIVE, null)));
    }

    // ── Comment validation ──

    @Test
    void createFlagRejectsCommentExceedingMaxLength() {
        Firestore firestore = mock(Firestore.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        when(reportService.getReport("report-1")).thenReturn(Map.of("id", "report-1"));

        FirestoreScanFlagService service = new FirestoreScanFlagService(providerOf(firestore), reportService, 10);

        assertThrows(ConflictException.class,
            () -> service.createReportFlag("user-1", "report-1",
                flagRequest(ScanFlagReasonCode.FALSE_POSITIVE, "This comment is way too long for the limit")));
    }

    @Test
    void createFlagAcceptsCommentWithinMaxLength() throws Exception {
        Firestore firestore = mock(Firestore.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        when(reportService.getReport("report-1")).thenReturn(Map.of("id", "report-1"));

        mockDuplicateCheckPasses(firestore);
        mockDocumentCreation(firestore, "flag-ok");

        FirestoreScanFlagService service = new FirestoreScanFlagService(providerOf(firestore), reportService, 500);
        CreateFlagRequest request = flagRequest(ScanFlagReasonCode.FALSE_POSITIVE, "Short comment");

        FlagResponse response = service.createReportFlag("user-1", "report-1", request);

        assertEquals("Short comment", response.comment());
    }

    // ── Successful creation ──

    @Test
    void createReportFlagSucceeds() throws Exception {
        Firestore firestore = mock(Firestore.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        when(reportService.getReport("report-1")).thenReturn(Map.of("id", "report-1"));

        mockDuplicateCheckPasses(firestore);
        mockDocumentCreation(firestore, "flag-1");

        FirestoreScanFlagService service = new FirestoreScanFlagService(providerOf(firestore), reportService, 500);

        FlagResponse response = service.createReportFlag("user-1", "report-1",
            flagRequest(ScanFlagReasonCode.FALSE_POSITIVE, "Test comment"));

        assertEquals("flag-1", response.flagId());
        assertEquals("report-1", response.reportId());
        assertEquals("report", response.flagType());
        assertNull(response.findingId());
        assertEquals("FALSE_POSITIVE", response.reasonCode());
        assertEquals("Test comment", response.comment());
        assertEquals("open", response.status());
        assertNotNull(response.createdAt());
    }

    @Test
    void createFindingFlagSucceedsWithValidFinding() throws Exception {
        Firestore firestore = mock(Firestore.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        Map<String, Object> report = Map.of(
            "sections", Map.of(
                "Links", Map.of(
                    "findings", List.of(
                        Map.of("id", "links-1", "target", "https://example.com")
                    )
                )
            )
        );
        when(reportService.getReport("report-1")).thenReturn(report);

        mockDuplicateCheckPasses(firestore);
        mockDocumentCreation(firestore, "flag-2");

        FirestoreScanFlagService service = new FirestoreScanFlagService(providerOf(firestore), reportService, 500);

        FlagResponse response = service.createFindingFlag("user-1", "report-1", "links-1",
            flagRequest(ScanFlagReasonCode.MISCLASSIFIED, null));

        assertEquals("flag-2", response.flagId());
        assertEquals("finding", response.flagType());
        assertEquals("links-1", response.findingId());
        assertEquals("MISCLASSIFIED", response.reasonCode());
    }

    // ── Helpers ──

    private void mockDuplicateCheckPasses(Firestore firestore) throws Exception {
        CollectionReference collection = mock(CollectionReference.class);
        Query query = mock(Query.class);
        when(firestore.collection("scan_flags")).thenReturn(collection);
        when(collection.whereEqualTo(anyString(), any())).thenReturn(query);
        when(query.whereEqualTo(anyString(), any())).thenReturn(query);
        when(query.limit(anyInt())).thenReturn(query);

        ApiFuture<QuerySnapshot> queryFuture = mock(ApiFuture.class);
        QuerySnapshot querySnapshot = mock(QuerySnapshot.class);
        when(query.get()).thenReturn(queryFuture);
        when(queryFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.isEmpty()).thenReturn(true); // no duplicate

        DocumentReference newDocRef = mock(DocumentReference.class);
        ApiFuture<DocumentReference> addFuture = mock(ApiFuture.class);
        when(collection.add(any())).thenReturn(addFuture);
        when(addFuture.get()).thenReturn(newDocRef);
        when(newDocRef.getId()).thenReturn("flag-default");
    }

    private void mockDocumentCreation(Firestore firestore, String flagId) throws Exception {
        // Override the document ID returned by add()
        CollectionReference collection = firestore.collection("scan_flags");
        DocumentReference newDocRef = mock(DocumentReference.class);
        ApiFuture<DocumentReference> addFuture = mock(ApiFuture.class);
        when(collection.add(any())).thenReturn(addFuture);
        when(addFuture.get()).thenReturn(newDocRef);
        when(newDocRef.getId()).thenReturn(flagId);
    }

    private CreateFlagRequest flagRequest(ScanFlagReasonCode code, String comment) {
        CreateFlagRequest request = new CreateFlagRequest();
        request.setReasonCode(code);
        request.setComment(comment);
        return request;
    }
}
