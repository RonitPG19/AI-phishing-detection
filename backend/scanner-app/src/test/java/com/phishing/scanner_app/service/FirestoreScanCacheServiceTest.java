package com.phishing.scanner_app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@SuppressWarnings("unchecked")
class FirestoreScanCacheServiceTest {

    private static ObjectProvider<Firestore> providerOf(Firestore firestore) {
        ObjectProvider<Firestore> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(firestore);
        return provider;
    }

    // ── Null Firestore graceful degradation ──

    @Test
    void getReturnsEmptyWhenFirestoreNull() {
        FirestoreScanCacheService service = new FirestoreScanCacheService(providerOf(null), new ObjectMapper());

        assertEquals(Optional.empty(), service.get("any-key"));
    }

    @Test
    void saveNoOpWhenFirestoreNull() {
        FirestoreScanCacheService service = new FirestoreScanCacheService(providerOf(null), new ObjectMapper());

        assertDoesNotThrow(() ->
            service.save("key", "fp", "v1", "full_email", null, "r1", "2026-04-20T12:00:00Z"));
    }

    @Test
    void recordCacheHitNoOpWhenFirestoreNull() {
        FirestoreScanCacheService service = new FirestoreScanCacheService(providerOf(null), new ObjectMapper());

        assertDoesNotThrow(() -> service.recordCacheHit("any-key"));
    }

    // ── Cache failure degrades gracefully ──

    @Test
    void getReturnsEmptyOnFirestoreException() throws Exception {
        Firestore firestore = mock(Firestore.class);
        CollectionReference collection = mock(CollectionReference.class);
        DocumentReference docRef = mock(DocumentReference.class);
        ApiFuture<DocumentSnapshot> future = mock(ApiFuture.class);

        when(firestore.collection("scan_cache")).thenReturn(collection);
        when(collection.document("cache-1")).thenReturn(docRef);
        when(docRef.get()).thenReturn(future);
        when(future.get()).thenThrow(new RuntimeException("Firestore unavailable"));

        FirestoreScanCacheService service = new FirestoreScanCacheService(providerOf(firestore), new ObjectMapper());

        assertEquals(Optional.empty(), service.get("cache-1"));
    }

    // ── Expired cache entry treated as miss ──

    @Test
    void getReturnsEmptyForExpiredEntry() throws Exception {
        Firestore firestore = mock(Firestore.class);
        CollectionReference collection = mock(CollectionReference.class);
        DocumentReference docRef = mock(DocumentReference.class);
        ApiFuture<DocumentSnapshot> future = mock(ApiFuture.class);
        DocumentSnapshot snapshot = mock(DocumentSnapshot.class);

        when(firestore.collection("scan_cache")).thenReturn(collection);
        when(collection.document("cache-1")).thenReturn(docRef);
        when(docRef.get()).thenReturn(future);
        when(future.get()).thenReturn(snapshot);
        when(snapshot.exists()).thenReturn(true);
        when(snapshot.getString("expiresAt")).thenReturn("2020-01-01T00:00:00Z");

        FirestoreScanCacheService service = new FirestoreScanCacheService(providerOf(firestore), new ObjectMapper());

        assertEquals(Optional.empty(), service.get("cache-1"));
    }

    // ── Non-existent cache entry ──

    @Test
    void getReturnsEmptyForNonExistentEntry() throws Exception {
        Firestore firestore = mock(Firestore.class);
        CollectionReference collection = mock(CollectionReference.class);
        DocumentReference docRef = mock(DocumentReference.class);
        ApiFuture<DocumentSnapshot> future = mock(ApiFuture.class);
        DocumentSnapshot snapshot = mock(DocumentSnapshot.class);

        when(firestore.collection("scan_cache")).thenReturn(collection);
        when(collection.document("cache-1")).thenReturn(docRef);
        when(docRef.get()).thenReturn(future);
        when(future.get()).thenReturn(snapshot);
        when(snapshot.exists()).thenReturn(false);

        FirestoreScanCacheService service = new FirestoreScanCacheService(providerOf(firestore), new ObjectMapper());

        assertEquals(Optional.empty(), service.get("cache-1"));
    }
}
