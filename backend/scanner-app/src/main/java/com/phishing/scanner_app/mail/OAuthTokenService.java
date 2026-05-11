package com.phishing.scanner_app.mail;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.phishing.scanner_app.exception.MailIntegrationException;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Provides valid OAuth access tokens for connected mailbox providers.
 */
@Service
public class OAuthTokenService {

    private static final long EXPIRY_SKEW_SECONDS = 60;

    private final OAuthTokenStore tokenStore;
    private final ClientRegistrationRepository clientRegistrationRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public OAuthTokenService(
        OAuthTokenStore tokenStore,
        ClientRegistrationRepository clientRegistrationRepository,
        ObjectMapper objectMapper
    ) {
        this.tokenStore = tokenStore;
        this.clientRegistrationRepository = clientRegistrationRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    public Optional<StoredOAuthToken> find(String userId, String provider) {
        return tokenStore.find(userId, normalizeProvider(provider));
    }

    public void save(StoredOAuthToken token) {
        tokenStore.save(token);
    }

    public void disconnect(String userId, String provider) {
        tokenStore.delete(userId, normalizeProvider(provider));
    }

    public String getAccessToken(String userId, String provider) {
        String normalizedProvider = normalizeProvider(provider);
        StoredOAuthToken token = tokenStore.find(userId, normalizedProvider)
            .orElseThrow(() -> new MailIntegrationException("Mailbox provider is not connected: " + normalizedProvider));

        if (!isExpiring(token)) {
            return token.accessToken();
        }

        if (token.refreshToken() == null || token.refreshToken().isBlank()) {
            throw new MailIntegrationException("OAuth refresh token is missing. Reconnect the mailbox provider.");
        }

        return refresh(token).accessToken();
    }

    private StoredOAuthToken refresh(StoredOAuthToken token) {
        ClientRegistration registration = clientRegistrationRepository.findByRegistrationId(token.provider());
        if (registration == null) {
            throw new MailIntegrationException("Unknown OAuth provider: " + token.provider());
        }

        Map<String, String> form = new LinkedHashMap<>();
        form.put("grant_type", "refresh_token");
        form.put("refresh_token", token.refreshToken());
        form.put("client_id", registration.getClientId());
        form.put("client_secret", registration.getClientSecret());

        HttpRequest request = HttpRequest.newBuilder(URI.create(registration.getProviderDetails().getTokenUri()))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(formEncode(form)))
            .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new MailIntegrationException("OAuth token refresh failed for provider: " + token.provider());
            }

            JsonNode body = objectMapper.readTree(response.body());
            Instant expiresAt = Instant.now().plusSeconds(body.path("expires_in").asLong(3600));
            StoredOAuthToken refreshed = new StoredOAuthToken(
                token.userId(),
                token.provider(),
                body.path("access_token").asText(),
                body.path("refresh_token").asText(token.refreshToken()),
                expiresAt,
                token.scopes(),
                Instant.now()
            );
            tokenStore.save(refreshed);
            return refreshed;
        } catch (IOException exception) {
            throw new MailIntegrationException("Unable to refresh OAuth token", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new MailIntegrationException("OAuth token refresh was interrupted", exception);
        }
    }

    private boolean isExpiring(StoredOAuthToken token) {
        return token.accessTokenExpiresAt() == null
            || token.accessTokenExpiresAt().minusSeconds(EXPIRY_SKEW_SECONDS).isBefore(Instant.now());
    }

    private String normalizeProvider(String provider) {
        if (provider == null || provider.isBlank()) {
            return "google";
        }
        return provider.toLowerCase();
    }

    private String formEncode(Map<String, String> form) {
        return form.entrySet().stream()
            .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
            .reduce((left, right) -> left + "&" + right)
            .orElse("");
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
