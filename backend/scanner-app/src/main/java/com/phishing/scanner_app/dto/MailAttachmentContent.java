package com.phishing.scanner_app.dto;

/**
 * Downloaded attachment content from a mail provider.
 */
public record MailAttachmentContent(
    String filename,
    String mimeType,
    byte[] content
) {
}
