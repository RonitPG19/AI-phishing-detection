package com.phishing.scanner_app.dto;

/**
 * Attachment metadata returned by a mail provider.
 */
public record MailAttachmentResponse(
    String id,
    String filename,
    String mimeType,
    long size
) {
}
