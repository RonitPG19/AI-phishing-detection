package com.phishing.scanner_app.mail;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.phishing.scanner_app.dto.MailAttachmentContent;
import com.phishing.scanner_app.dto.MailAttachmentResponse;
import com.phishing.scanner_app.dto.MailMessageResponse;
import com.phishing.scanner_app.dto.MailSummaryResponse;
import com.phishing.scanner_app.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
public class GmailProviderClient extends AbstractMailProviderClient {

    private static final String GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

    public GmailProviderClient(OAuthTokenService tokenService, ObjectMapper objectMapper) {
        super(tokenService, objectMapper);
    }

    @Override
    public String provider() {
        return "google";
    }

    @Override
    public List<MailSummaryResponse> listMessages(String userId, int limit, String query) {
        int effectiveLimit = Math.clamp(limit, 1, 25);
        String url = GMAIL_API + "/messages?maxResults=" + effectiveLimit;
        if (query != null && !query.isBlank()) {
            url += "&q=" + encodeQueryValue(query);
        }

        JsonNode response = getJson(userId, url);
        List<MailSummaryResponse> messages = new ArrayList<>();
        for (JsonNode messageRef : response.path("messages")) {
            messages.add(toSummary(getJson(userId, GMAIL_API + "/messages/" + messageRef.path("id").asText()
                + "?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date")));
        }
        return messages;
    }

    @Override
    public MailMessageResponse getMessage(String userId, String messageId) {
        JsonNode message = getJson(userId, GMAIL_API + "/messages/" + encodeQueryValue(messageId) + "?format=full");
        JsonNode payload = message.path("payload");
        List<MailAttachmentResponse> attachments = collectAttachments(payload);

        return new MailMessageResponse(
            text(message, "id"),
            text(message, "threadId"),
            header(payload, "Subject"),
            header(payload, "From"),
            header(payload, "To"),
            header(payload, "Date"),
            text(message, "snippet"),
            firstBody(payload, "text/plain"),
            firstBody(payload, "text/html"),
            attachments
        );
    }

    @Override
    public MailAttachmentContent getAttachment(String userId, String messageId, String attachmentId) {
        MailAttachmentResponse metadata = getMessage(userId, messageId).attachments().stream()
            .filter(attachment -> attachment.id().equals(attachmentId))
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));

        JsonNode response = getJson(userId, GMAIL_API + "/messages/" + encodeQueryValue(messageId)
            + "/attachments/" + encodeQueryValue(attachmentId));
        return new MailAttachmentContent(
            metadata.filename(),
            metadata.mimeType(),
            decodeBase64Url(response.path("data").asText())
        );
    }

    private MailSummaryResponse toSummary(JsonNode message) {
        JsonNode payload = message.path("payload");
        List<MailAttachmentResponse> attachments = collectAttachments(payload);
        return new MailSummaryResponse(
            text(message, "id"),
            text(message, "threadId"),
            header(payload, "Subject"),
            header(payload, "From"),
            header(payload, "Date"),
            text(message, "snippet"),
            !attachments.isEmpty(),
            attachments
        );
    }

    private String header(JsonNode payload, String name) {
        for (JsonNode header : payload.path("headers")) {
            if (name.equalsIgnoreCase(header.path("name").asText())) {
                return header.path("value").asText();
            }
        }
        return null;
    }

    private String firstBody(JsonNode part, String mimeType) {
        if (mimeType.equalsIgnoreCase(part.path("mimeType").asText())) {
            String data = part.path("body").path("data").asText(null);
            if (data != null) {
                return new String(decodeBase64Url(data), StandardCharsets.UTF_8);
            }
        }

        for (JsonNode child : part.path("parts")) {
            String body = firstBody(child, mimeType);
            if (body != null && !body.isBlank()) {
                return body;
            }
        }
        return null;
    }

    private List<MailAttachmentResponse> collectAttachments(JsonNode part) {
        List<MailAttachmentResponse> attachments = new ArrayList<>();
        collectAttachments(part, attachments);
        return attachments;
    }

    private void collectAttachments(JsonNode part, List<MailAttachmentResponse> attachments) {
        String attachmentId = part.path("body").path("attachmentId").asText(null);
        String filename = part.path("filename").asText("");
        if (attachmentId != null && !filename.isBlank()) {
            attachments.add(new MailAttachmentResponse(
                attachmentId,
                filename,
                part.path("mimeType").asText("application/octet-stream"),
                part.path("body").path("size").asLong(0)
            ));
        }

        for (JsonNode child : part.path("parts")) {
            collectAttachments(child, attachments);
        }
    }
}
