package com.phishing.scanner_app.mail;

import com.phishing.scanner_app.dto.MailAttachmentContent;
import com.phishing.scanner_app.dto.MailConnectionResponse;
import com.phishing.scanner_app.dto.MailMessageResponse;
import com.phishing.scanner_app.dto.MailSummaryResponse;
import com.phishing.scanner_app.exception.MailIntegrationException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Coordinates mailbox operations across supported providers.
 */
@Service
public class MailboxService {

    private final Map<String, MailProviderClient> clients;
    private final OAuthTokenService tokenService;

    public MailboxService(List<MailProviderClient> clients, OAuthTokenService tokenService) {
        this.clients = clients.stream().collect(Collectors.toUnmodifiableMap(MailProviderClient::provider, Function.identity()));
        this.tokenService = tokenService;
    }

    public List<MailConnectionResponse> connections(String userId) {
        return clients.keySet().stream()
            .sorted()
            .map(provider -> new MailConnectionResponse(provider, tokenService.find(userId, provider).isPresent()))
            .toList();
    }

    public List<MailSummaryResponse> listMessages(String userId, String provider, int limit, String query) {
        return client(provider).listMessages(userId, limit, query);
    }

    public MailMessageResponse getMessage(String userId, String provider, String messageId) {
        return client(provider).getMessage(userId, messageId);
    }

    public MailAttachmentContent getAttachment(String userId, String provider, String messageId, String attachmentId) {
        return client(provider).getAttachment(userId, messageId, attachmentId);
    }

    public void disconnect(String userId, String provider) {
        tokenService.disconnect(userId, provider);
    }

    private MailProviderClient client(String provider) {
        String normalizedProvider = provider == null || provider.isBlank() ? "google" : provider.toLowerCase();
        MailProviderClient client = clients.get(normalizedProvider);
        if (client == null) {
            throw new MailIntegrationException("Unsupported mail provider: " + normalizedProvider);
        }
        return client;
    }
}
