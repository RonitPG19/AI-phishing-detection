package com.phishing.scanner_app.mail;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

final class InMemoryOAuthTokenStore implements OAuthTokenStore {

    private final Map<String, StoredOAuthToken> tokens = new ConcurrentHashMap<>();

    @Override
    public void save(StoredOAuthToken token) {
        tokens.put(key(token.userId(), token.provider()), token);
    }

    @Override
    public Optional<StoredOAuthToken> find(String userId, String provider) {
        return Optional.ofNullable(tokens.get(key(userId, provider)));
    }

    @Override
    public void delete(String userId, String provider) {
        tokens.remove(key(userId, provider));
    }

    private String key(String userId, String provider) {
        return provider + ":" + userId;
    }
}
