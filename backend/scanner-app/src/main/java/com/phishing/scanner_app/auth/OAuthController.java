package com.phishing.scanner_app.auth;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;

/**
 * Exposes OAuth2 login metadata for clients.
 */
@RestController
@RequestMapping("/api/oauth")
public class OAuthController {

    private final ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository;

    public OAuthController(ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository) {
        this.clientRegistrationRepository = clientRegistrationRepository;
    }

    /**
     * Lists configured OAuth2 providers and their authorization URLs.
     *
     * @return configured OAuth2 login providers
     */
    @GetMapping("/providers")
    public ResponseEntity<List<OAuthProviderResponse>> providers() {
        ClientRegistrationRepository repository = clientRegistrationRepository.getIfAvailable();
        if (!(repository instanceof Iterable<?> registrations)) {
            return ResponseEntity.ok(List.of());
        }

        List<OAuthProviderResponse> providers = StreamSupport.stream(registrations.spliterator(), false)
                .filter(ClientRegistration.class::isInstance)
                .map(ClientRegistration.class::cast)
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(providers);
    }

    /**
     * Returns the current authenticated principal, useful after storing the JWT client-side.
     *
     * @param authentication current Spring Security authentication
     * @return authenticated user summary
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false));
        }

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "uid", authentication.getName(),
                "authorities", authentication.getAuthorities()
        ));
    }

    private OAuthProviderResponse toResponse(ClientRegistration registration) {
        return new OAuthProviderResponse(
                registration.getRegistrationId(),
                registration.getClientName(),
                "/oauth2/authorization/" + registration.getRegistrationId()
        );
    }

    public record OAuthProviderResponse(String registrationId, String clientName, String authorizationUrl) {
    }
}
