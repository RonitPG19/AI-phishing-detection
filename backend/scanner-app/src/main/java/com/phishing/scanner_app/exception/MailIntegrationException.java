package com.phishing.scanner_app.exception;

/**
 * Raised when a connected mail provider cannot complete the requested operation.
 */
public class MailIntegrationException extends RuntimeException {

    public MailIntegrationException(String message) {
        super(message);
    }

    public MailIntegrationException(String message, Throwable cause) {
        super(message, cause);
    }
}
