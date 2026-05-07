package com.phishing.scanner_app.dto;

import java.util.List;

/**
 * Lightweight mail message summary for mailbox listing screens.
 */
public record MailSummaryResponse(
    String id,
    String threadId,
    String subject,
    String from,
    String date,
    String snippet,
    boolean hasAttachments,
    List<MailAttachmentResponse> attachments
) {
}
