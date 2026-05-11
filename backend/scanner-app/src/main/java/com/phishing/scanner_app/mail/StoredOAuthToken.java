package com.phishing.scanner_app.mail;

import java.time.Instant;
import java.util.Set;

/**
 * OAuth tokens stored for a connected mailbox provider.
 */
public record StoredOAuthToken(
    String userId,
    String provider,
    String accessToken,
    String refreshToken,
    Instant accessTokenExpiresAt,
    Set<String> scopes,
    Instant updatedAt
) {
}
