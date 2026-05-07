package com.phishing.scanner_app.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Adds provider-specific OAuth authorization parameters required for mailbox access.
 */
public class MailboxAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private static final String AUTHORIZATION_REQUEST_BASE_URI = "/oauth2/authorization";

    private final OAuth2AuthorizationRequestResolver delegate;

    public MailboxAuthorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository) {
        this.delegate = new DefaultOAuth2AuthorizationRequestResolver(
            clientRegistrationRepository,
            AUTHORIZATION_REQUEST_BASE_URI
        );
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return customize(delegate.resolve(request));
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        return customize(delegate.resolve(request, clientRegistrationId));
    }

    private OAuth2AuthorizationRequest customize(OAuth2AuthorizationRequest request) {
        if (request == null || !isGoogle(request)) {
            return request;
        }

        Map<String, Object> parameters = new LinkedHashMap<>(request.getAdditionalParameters());
        parameters.put("access_type", "offline");
        parameters.put("prompt", "consent");

        return OAuth2AuthorizationRequest.from(request)
            .additionalParameters(parameters)
            .build();
    }

    private boolean isGoogle(OAuth2AuthorizationRequest request) {
        String authorizationUri = request.getAuthorizationUri();
        return authorizationUri != null && authorizationUri.contains("accounts.google.com");
    }
}
