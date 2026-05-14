package com.phishing.scanner_app.mail;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.phishing.scanner_app.dto.MailAttachmentContent;
import com.phishing.scanner_app.dto.MailAttachmentResponse;
import com.phishing.scanner_app.dto.MailMessageResponse;
import com.phishing.scanner_app.dto.MailSummaryResponse;
import com.phishing.scanner_app.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class OutlookProviderClient extends AbstractMailProviderClient {

    private static final String GRAPH_API = "https://graph.microsoft.com/v1.0/me";

    public OutlookProviderClient(OAuthTokenService tokenService, ObjectMapper objectMapper) {
        super(tokenService, objectMapper);
    }

    @Override
    public String provider() {
        return "outlook";
    }

    @Override
    public List<MailSummaryResponse> listMessages(String userId, int limit, String query) {
        int effectiveLimit = Math.clamp(limit, 1, 25);
        String url = GRAPH_API + "/messages?$top=" + effectiveLimit
            + "&$select=id,conversationId,subject,from,receivedDateTime,bodyPreview,hasAttachments";
        if (query != null && !query.isBlank()) {
            url += "&$search=%22" + encodeQueryValue(query) + "%22";
        }

        JsonNode response = getJson(userId, url);
        List<MailSummaryResponse> messages = new ArrayList<>();
        for (JsonNode message : response.path("value")) {
            messages.add(new MailSummaryResponse(
                text(message, "id"),
                text(message, "conversationId"),
                text(message, "subject"),
                message.path("from").path("emailAddress").path("address").asText(null),
                text(message, "receivedDateTime"),
                text(message, "bodyPreview"),
                message.path("hasAttachments").asBoolean(false),
                List.of()
            ));
        }
        return messages;
    }

    @Override
    public MailMessageResponse getMessage(String userId, String messageId) {
        JsonNode message = getJson(userId, GRAPH_API + "/messages/" + encodeQueryValue(messageId)
            + "?$select=id,conversationId,subject,from,toRecipients,receivedDateTime,bodyPreview,body,hasAttachments");
        List<MailAttachmentResponse> attachments = listAttachments(userId, messageId);

        return new MailMessageResponse(
            text(message, "id"),
            text(message, "conversationId"),
            text(message, "subject"),
            message.path("from").path("emailAddress").path("address").asText(null),
            recipients(message.path("toRecipients")),
            text(message, "receivedDateTime"),
            text(message, "bodyPreview"),
            "text".equalsIgnoreCase(message.path("body").path("contentType").asText()) ? message.path("body").path("content").asText(null) : null,
            "html".equalsIgnoreCase(message.path("body").path("contentType").asText()) ? message.path("body").path("content").asText(null) : null,
            attachments
        );
    }

    @Override
    public MailAttachmentContent getAttachment(String userId, String messageId, String attachmentId, String filename, String mimeType) {
        JsonNode attachment = getJson(userId, GRAPH_API + "/messages/" + encodeQueryValue(messageId)
            + "/attachments/" + encodeQueryValue(attachmentId));
        String content = attachment.path("contentBytes").asText(null);
        if (content == null) {
            throw new ResourceNotFoundException("Attachment content not found");
        }

        return new MailAttachmentContent(
            attachment.path("name").asText(filename != null ? filename : "attachment"),
            attachment.path("contentType").asText(mimeType != null ? mimeType : "application/octet-stream"),
            decodeBase64(content)
        );
    }

    private List<MailAttachmentResponse> listAttachments(String userId, String messageId) {
        JsonNode response = getJson(userId, GRAPH_API + "/messages/" + encodeQueryValue(messageId)
            + "/attachments?$select=id,name,contentType,size");
        List<MailAttachmentResponse> attachments = new ArrayList<>();
        for (JsonNode attachment : response.path("value")) {
            attachments.add(new MailAttachmentResponse(
                text(attachment, "id"),
                text(attachment, "name"),
                text(attachment, "contentType"),
                attachment.path("size").asLong(0)
            ));
        }
        return attachments;
    }

    private String recipients(JsonNode recipients) {
        List<String> addresses = new ArrayList<>();
        for (JsonNode recipient : recipients) {
            String address = recipient.path("emailAddress").path("address").asText(null);
            if (address != null && !address.isBlank()) {
                addresses.add(address);
            }
        }
        return String.join(", ", addresses);
    }
}
