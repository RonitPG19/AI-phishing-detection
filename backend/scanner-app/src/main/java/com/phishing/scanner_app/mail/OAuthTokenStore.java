package com.phishing.scanner_app.mail;

import java.util.Optional;

/**
 * Persists OAuth tokens by application user and provider.
 */
public interface OAuthTokenStore {

    void save(StoredOAuthToken token);

    Optional<StoredOAuthToken> find(String userId, String provider);

    void delete(String userId, String provider);
}
