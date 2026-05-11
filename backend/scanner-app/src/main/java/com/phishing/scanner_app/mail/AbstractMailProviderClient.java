package com.phishing.scanner_app.mail;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.phishing.scanner_app.exception.MailIntegrationException;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

abstract class AbstractMailProviderClient implements MailProviderClient {

    protected final OAuthTokenService tokenService;
    protected final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    protected AbstractMailProviderClient(OAuthTokenService tokenService, ObjectMapper objectMapper) {
        this.tokenService = tokenService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    protected JsonNode getJson(String userId, String url) {
        String accessToken = tokenService.getAccessToken(userId, provider());
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
            .header("Authorization", "Bearer " + accessToken)
            .header("Accept", "application/json")
            .GET()
            .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new MailIntegrationException(provider() + " API request failed with status " + response.statusCode());
            }
            return objectMapper.readTree(response.body());
        } catch (IOException exception) {
            throw new MailIntegrationException("Unable to call " + provider() + " API", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new MailIntegrationException(provider() + " API request was interrupted", exception);
        }
    }

    protected String encodeQueryValue(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    protected byte[] decodeBase64Url(String value) {
        if (value == null || value.isBlank()) {
            return new byte[0];
        }
        return Base64.getUrlDecoder().decode(value);
    }

    protected byte[] decodeBase64(String value) {
        if (value == null || value.isBlank()) {
            return new byte[0];
        }
        return Base64.getDecoder().decode(value);
    }

    protected String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : value.asText();
    }
}
