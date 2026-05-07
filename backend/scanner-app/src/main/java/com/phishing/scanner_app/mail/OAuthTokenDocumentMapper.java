package com.phishing.scanner_app.mail;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

final class OAuthTokenDocumentMapper {

    private OAuthTokenDocumentMapper() {
    }

    static Map<String, Object> toDocument(StoredOAuthToken token) {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("userId", token.userId());
        document.put("provider", token.provider());
        document.put("accessToken", token.accessToken());
        document.put("refreshToken", token.refreshToken());
        document.put("accessTokenExpiresAt", token.accessTokenExpiresAt() == null ? null : token.accessTokenExpiresAt().toString());
        document.put("scopes", List.copyOf(token.scopes()));
        document.put("updatedAt", token.updatedAt().toString());
        return document;
    }

    @SuppressWarnings("unchecked")
    static StoredOAuthToken fromDocument(Map<String, Object> document) {
        Object scopesValue = document.get("scopes");
        Set<String> scopes = scopesValue instanceof List<?> list
            ? new LinkedHashSet<>(list.stream().map(String::valueOf).toList())
            : Set.of();

        return new StoredOAuthToken(
            (String) document.get("userId"),
            (String) document.get("provider"),
            (String) document.get("accessToken"),
            (String) document.get("refreshToken"),
            parseInstant((String) document.get("accessTokenExpiresAt")),
            scopes,
            parseInstant((String) document.get("updatedAt"))
        );
    }

    private static Instant parseInstant(String value) {
        return value == null || value.isBlank() ? null : Instant.parse(value);
    }
}
