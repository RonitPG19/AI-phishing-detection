package com.phishing.scanner_app.dto;

import java.util.List;

/**
 * Full mail message payload returned by a connected mailbox provider.
 */
public record MailMessageResponse(
    String id,
    String threadId,
    String subject,
    String from,
    String to,
    String date,
    String snippet,
    String bodyText,
    String bodyHtml,
    List<MailAttachmentResponse> attachments
) {
}
