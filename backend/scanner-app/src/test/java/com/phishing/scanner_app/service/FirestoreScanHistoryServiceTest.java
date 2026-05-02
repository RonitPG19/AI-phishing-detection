package com.phishing.scanner_app.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteResult;
import com.phishing.scanner_app.dto.CachedScanPayload;
import com.phishing.scanner_app.dto.ScanCategoryResponse;
import com.phishing.scanner_app.dto.ScanSectionsResponse;
import com.phishing.scanner_app.exception.AccessDeniedException;
import com.phishing.scanner_app.exception.PersistenceUnavailableException;
import com.phishing.scanner_app.exception.ResourceNotFoundException;
import com.phishing.scanner_app.model.HeaderInspectionResult;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("unchecked")
class FirestoreScanHistoryServiceTest {

    private static ObjectProvider<Firestore> providerOf(Firestore firestore) {
        ObjectProvider<Firestore> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(firestore);
        return provider;
    }

    private FirestoreScanHistoryService createService(Firestore firestore) {
        return new FirestoreScanHistoryService(providerOf(firestore), new ScanResponseMapper(), 50);
    }

    // ── Firestore unavailable → PersistenceUnavailableException ──

    @Test
    void listHistoryThrowsWhenFirestoreNull() {
        FirestoreScanHistoryService service = createService(null);

        assertThrows(PersistenceUnavailableException.class,
            () -> service.listHistory("user-1", 10, null));
    }

    @Test
    void getHistoryThrowsWhenFirestoreNull() {
        FirestoreScanHistoryService service = createService(null);

        assertThrows(PersistenceUnavailableException.class,
            () -> service.getHistory("user-1", "hist-1"));
    }

    @Test
    void softDeleteThrowsWhenFirestoreNull() {
        FirestoreScanHistoryService service = createService(null);

        assertThrows(PersistenceUnavailableException.class,
            () -> service.softDelete("user-1", "hist-1"));
    }

    // ── save degrades gracefully when Firestore null ──

    @Test
    void saveReturnsNullWhenFirestoreNull() {
        FirestoreScanHistoryService service = createService(null);

        String result = service.saveHistory("user-1", "report-1", "cache-1", "fresh_scan", minimalPayload(), Instant.now());

        assertNull(result);
    }

    // ── getHistory ownership checks ──

    @Test
    void getHistoryWrongUserThrowsAccessDenied() throws Exception {
        Firestore firestore = mock(Firestore.class);
        DocumentSnapshot snapshot = mockDocumentLookup(firestore, "hist-1");

        when(snapshot.exists()).thenReturn(true);
        when(snapshot.getString("deletedAt")).thenReturn(null);
        when(snapshot.getString("userId")).thenReturn("other-user");

        FirestoreScanHistoryService service = createService(firestore);

        assertThrows(AccessDeniedException.class,
            () -> service.getHistory("user-1", "hist-1"));
    }

    @Test
    void getHistoryDeletedItemThrowsNotFound() throws Exception {
        Firestore firestore = mock(Firestore.class);
        DocumentSnapshot snapshot = mockDocumentLookup(firestore, "hist-1");

        when(snapshot.exists()).thenReturn(true);
        when(snapshot.getString("deletedAt")).thenReturn("2026-04-19T00:00:00Z");

        FirestoreScanHistoryService service = createService(firestore);

        assertThrows(ResourceNotFoundException.class,
            () -> service.getHistory("user-1", "hist-1"));
    }

    @Test
    void getHistoryNonexistentThrowsNotFound() throws Exception {
        Firestore firestore = mock(Firestore.class);
        DocumentSnapshot snapshot = mockDocumentLookup(firestore, "hist-1");

        when(snapshot.exists()).thenReturn(false);

        FirestoreScanHistoryService service = createService(firestore);

        assertThrows(ResourceNotFoundException.class,
            () -> service.getHistory("user-1", "hist-1"));
    }

    // ── softDelete ownership checks ──

    @Test
    void softDeleteWrongUserThrowsAccessDenied() throws Exception {
        Firestore firestore = mock(Firestore.class);
        DocumentSnapshot snapshot = mockDocumentLookup(firestore, "hist-1");

        when(snapshot.exists()).thenReturn(true);
        when(snapshot.getString("deletedAt")).thenReturn(null);
        when(snapshot.getString("userId")).thenReturn("other-user");

        FirestoreScanHistoryService service = createService(firestore);

        assertThrows(AccessDeniedException.class,
            () -> service.softDelete("user-1", "hist-1"));
    }

    @Test
    void softDeleteAlreadyDeletedThrowsNotFound() throws Exception {
        Firestore firestore = mock(Firestore.class);
        DocumentSnapshot snapshot = mockDocumentLookup(firestore, "hist-1");

        when(snapshot.exists()).thenReturn(true);
        when(snapshot.getString("deletedAt")).thenReturn("2026-04-19T00:00:00Z");

        FirestoreScanHistoryService service = createService(firestore);

        assertThrows(ResourceNotFoundException.class,
            () -> service.softDelete("user-1", "hist-1"));
    }

    @Test
    void softDeleteCorrectUserSucceeds() throws Exception {
        Firestore firestore = mock(Firestore.class);
        CollectionReference collection = mock(CollectionReference.class);
        DocumentReference docRef = mock(DocumentReference.class);
        ApiFuture<DocumentSnapshot> getFuture = mock(ApiFuture.class);
        DocumentSnapshot snapshot = mock(DocumentSnapshot.class);
        ApiFuture<WriteResult> updateFuture = mock(ApiFuture.class);

        when(firestore.collection("user_scan_history")).thenReturn(collection);
        when(collection.document("hist-1")).thenReturn(docRef);
        when(docRef.get()).thenReturn(getFuture);
        when(getFuture.get()).thenReturn(snapshot);
        when(snapshot.exists()).thenReturn(true);
        when(snapshot.getString("deletedAt")).thenReturn(null);
        when(snapshot.getString("userId")).thenReturn("user-1");
        when(docRef.update(anyString(), any())).thenReturn(updateFuture);
        when(updateFuture.get()).thenReturn(mock(WriteResult.class));

        FirestoreScanHistoryService service = createService(firestore);

        assertDoesNotThrow(() -> service.softDelete("user-1", "hist-1"));
        verify(docRef).update(eq("deletedAt"), anyString());
    }

    // ── Helpers ──

    private DocumentSnapshot mockDocumentLookup(Firestore firestore, String documentId) throws Exception {
        CollectionReference collection = mock(CollectionReference.class);
        DocumentReference docRef = mock(DocumentReference.class);
        ApiFuture<DocumentSnapshot> future = mock(ApiFuture.class);
        DocumentSnapshot snapshot = mock(DocumentSnapshot.class);

        when(firestore.collection("user_scan_history")).thenReturn(collection);
        when(collection.document(documentId)).thenReturn(docRef);
        when(docRef.get()).thenReturn(future);
        when(future.get()).thenReturn(snapshot);

        return snapshot;
    }

    private CachedScanPayload minimalPayload() {
        ScanCategoryResponse empty = new ScanCategoryResponse(List.of(), Map.of());
        ScanSectionsResponse sections = new ScanSectionsResponse(empty, empty, empty, empty);
        return new CachedScanPayload("Subject", "sender@e.com", 1, sections, new HeaderInspectionResult(), 10, "r1", null, "now");
    }
}
