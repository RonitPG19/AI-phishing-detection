package com.phishing.scanner_app.mail;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.beans.factory.ObjectProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger LOGGER = LoggerFactory.getLogger(FirestoreOAuthTokenStore.class);
    private static final String COLLECTION = "oauth_tokens";

    private final Firestore firestore;
    private final InMemoryOAuthTokenStore fallbackStore = new InMemoryOAuthTokenStore();

    public FirestoreOAuthTokenStore(ObjectProvider<Firestore> firestoreProvider) {
        this.firestore = firestoreProvider.getIfAvailable();
    }

    @Override
    public void save(StoredOAuthToken token) {
        // Keep an in-memory mirror so mailbox operations can continue if Firestore is temporarily unavailable.
        fallbackStore.save(token);

        if (firestore == null) {
            return;
        }

        try {
            firestore.collection(COLLECTION)
                .document(documentId(token.userId(), token.provider()))
                .set(OAuthTokenDocumentMapper.toDocument(token))
                .get();
        } catch (Exception exception) {
            LOGGER.warn("Firestore OAuth token save failed for provider={} userId={} - using in-memory fallback",
                token.provider(), token.userId(), exception);
        }
    }

    @Override
    public Optional<StoredOAuthToken> find(String userId, String provider) {
        Optional<StoredOAuthToken> inMemory = fallbackStore.find(userId, provider);

        if (firestore == null) {
            return inMemory;
        }

        try {
            DocumentSnapshot snapshot = firestore.collection(COLLECTION)
                    .document(documentId(userId, provider))
                    .get()
                    .get();
            if (!snapshot.exists()) {
                return inMemory;
            }

            Map<String, Object> data = snapshot.getData();
            if (data == null) {
                return inMemory;
            }

            StoredOAuthToken token = OAuthTokenDocumentMapper.fromDocument(data);
            fallbackStore.save(token);
            return Optional.of(token);
        } catch (Exception exception) {
            LOGGER.warn("Firestore OAuth token read failed for provider={} userId={} - falling back to in-memory token store",
                provider, userId, exception);
            return inMemory;
        }
    }

    @Override
    public void delete(String userId, String provider) {
        fallbackStore.delete(userId, provider);

        if (firestore == null) {
            return;
        }

        try {
            firestore.collection(COLLECTION).document(documentId(userId, provider)).delete().get();
        } catch (Exception exception) {
            LOGGER.warn("Firestore OAuth token delete failed for provider={} userId={}",
                provider, userId, exception);
        }
    }

    private String documentId(String userId, String provider) {
        String encodedUserId = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(userId.getBytes(StandardCharsets.UTF_8));
        return provider + "_" + encodedUserId;
    }
}
