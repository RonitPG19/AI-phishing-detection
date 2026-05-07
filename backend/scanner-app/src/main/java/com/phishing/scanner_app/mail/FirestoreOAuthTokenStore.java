package com.phishing.scanner_app.mail;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.phishing.scanner_app.exception.PersistenceUnavailableException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.Optional;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Firestore-backed token store used when Firebase is enabled.
 */
@Repository
public class FirestoreOAuthTokenStore implements OAuthTokenStore {

    private static final String COLLECTION = "oauth_tokens";

    private final Firestore firestore;
    private final InMemoryOAuthTokenStore fallbackStore = new InMemoryOAuthTokenStore();

    public FirestoreOAuthTokenStore(ObjectProvider<Firestore> firestoreProvider) {
        this.firestore = firestoreProvider.getIfAvailable();
    }

    @Override
    public void save(StoredOAuthToken token) {
        if (firestore == null) {
            fallbackStore.save(token);
            return;
        }

        try {
            firestore.collection(COLLECTION)
                .document(documentId(token.userId(), token.provider()))
                .set(OAuthTokenDocumentMapper.toDocument(token))
                .get();
        } catch (Exception exception) {
            throw new PersistenceUnavailableException("Unable to store OAuth token");
        }
    }

    @Override
    public Optional<StoredOAuthToken> find(String userId, String provider) {
        if (firestore == null) {
            return fallbackStore.find(userId, provider);
        }

        try {
            DocumentSnapshot snapshot = firestore.collection(COLLECTION)
                .document(documentId(userId, provider))
                .get()
                .get();
            if (!snapshot.exists()) {
                return Optional.empty();
            }

            Map<String, Object> data = snapshot.getData();
            return data == null ? Optional.empty() : Optional.of(OAuthTokenDocumentMapper.fromDocument(data));
        } catch (Exception exception) {
            throw new PersistenceUnavailableException("Unable to read OAuth token");
        }
    }

    @Override
    public void delete(String userId, String provider) {
        if (firestore == null) {
            fallbackStore.delete(userId, provider);
            return;
        }

        try {
            firestore.collection(COLLECTION).document(documentId(userId, provider)).delete().get();
        } catch (Exception exception) {
            throw new PersistenceUnavailableException("Unable to delete OAuth token");
        }
    }

    private String documentId(String userId, String provider) {
        String encodedUserId = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(userId.getBytes(StandardCharsets.UTF_8));
        return provider + "_" + encodedUserId;
    }
}
