package com.phishing.scanner_app.auth;

import com.phishing.scanner_app.security.JwtUtil;
import com.phishing.scanner_app.mail.OAuthTokenService;
import com.phishing.scanner_app.mail.StoredOAuthToken;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.time.Instant;

/**
 * Converts a successful OAuth2 login into this API's signed JWT and redirects the client.
 */
@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(OAuth2LoginSuccessHandler.class);
    private static final String DEFAULT_ROLE = "USER";

    private final JwtUtil jwtUtil;
    private final OAuth2AuthorizedClientService authorizedClientService;
    private final OAuthTokenService tokenService;
    private final String successRedirectUri;

    public OAuth2LoginSuccessHandler(
            JwtUtil jwtUtil,
            OAuth2AuthorizedClientService authorizedClientService,
            OAuthTokenService tokenService,
            @Value("${app.oauth2.success-redirect-uri:http://localhost:3000/oauth2/redirect}") String successRedirectUri) {
        this.jwtUtil = jwtUtil;
        this.authorizedClientService = authorizedClientService;
        this.tokenService = tokenService;
        this.successRedirectUri = successRedirectUri;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {

        if (!(authentication instanceof OAuth2AuthenticationToken oauthToken)) {
            throw new ServletException("Unsupported OAuth2 authentication type: " + authentication.getClass().getName());
        }

        OAuth2User principal = oauthToken.getPrincipal();
        String registrationId = oauthToken.getAuthorizedClientRegistrationId();
        String providerUserId = extractProviderUserId(principal);
        String uid = registrationId + ":" + providerUserId;

        Map<String, Object> tokenClaims = new LinkedHashMap<>();
        putIfPresent(tokenClaims, "email", principal.getAttribute("email"));
        putIfPresent(tokenClaims, "name", principal.getAttribute("name"));
        putIfPresent(tokenClaims, "picture", principal.getAttribute("picture"));
        tokenClaims.put("provider", registrationId);

        storeProviderToken(oauthToken, uid);

        String jwt = jwtUtil.generateToken(uid, DEFAULT_ROLE, tokenClaims);
        String redirectUri = successRedirectUri
                + "#token=" + URLEncoder.encode(jwt, StandardCharsets.UTF_8)
                + "&tokenType=Bearer";
        String safeRedirectUri = redirectUri.replaceAll("(token=)[^&]+", "$1<redacted>");

        LOGGER.info("OAuth2 login succeeded for provider={} uid={}", registrationId, uid);
        LOGGER.info("OAuth2 redirect target={}", safeRedirectUri);
        response.setStatus(HttpStatus.FOUND.value());
        response.setHeader("Location", redirectUri);
    }

    private void storeProviderToken(OAuth2AuthenticationToken oauthToken, String userId) {
        OAuth2AuthorizedClient authorizedClient = authorizedClientService.loadAuthorizedClient(
            oauthToken.getAuthorizedClientRegistrationId(),
            oauthToken.getName()
        );
        if (authorizedClient == null) {
            LOGGER.warn("OAuth2 login succeeded but authorized client was unavailable for provider={}",
                oauthToken.getAuthorizedClientRegistrationId());
            return;
        }

        OAuth2AccessToken accessToken = authorizedClient.getAccessToken();
        OAuth2RefreshToken refreshToken = authorizedClient.getRefreshToken();
        tokenService.save(new StoredOAuthToken(
            userId,
            oauthToken.getAuthorizedClientRegistrationId(),
            accessToken.getTokenValue(),
            refreshToken == null ? null : refreshToken.getTokenValue(),
            accessToken.getExpiresAt(),
            accessToken.getScopes(),
            Instant.now()
        ));
    }

    private String extractProviderUserId(OAuth2User principal) {
        Object subject = firstNonNull(
                principal.getAttribute("sub"),
                principal.getAttribute("id"),
                principal.getAttribute("email"),
                principal.getName());

        if (subject == null || subject.toString().isBlank()) {
            throw new IllegalStateException("OAuth2 provider did not return a stable user identifier");
        }

        return subject.toString();
    }

    private Object firstNonNull(Object... values) {
        for (Object value : values) {
            if (Objects.nonNull(value)) {
                return value;
            }
        }
        return null;
    }

    private void putIfPresent(Map<String, Object> claims, String key, Object value) {
        if (value != null) {
            claims.put(key, value);
        }
    }
}
