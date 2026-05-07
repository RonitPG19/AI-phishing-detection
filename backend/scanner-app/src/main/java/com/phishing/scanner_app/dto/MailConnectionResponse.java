package com.phishing.scanner_app.dto;

/**
 * Mail provider connection status for the authenticated application user.
 */
public record MailConnectionResponse(
    String provider,
    boolean connected
) {
}
