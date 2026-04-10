package com.phishing.scanner_app;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public class EmailRequest {

    @Size(max = 500, message = "Subject must not exceed 500 characters")
    private String subject;

    @Email(message = "Sender (from) must be a valid email address")
    private String from;

    @Size(max = 500_000, message = "HTML body must not exceed 500,000 characters")
    private String bodyHtml;

    @Size(max = 500_000, message = "Text body must not exceed 500,000 characters")
    private String bodyText;

    private Map<String, List<String>> headers;

    /**
     * Extracted links from the email, each with href and display text.
     * When bodyHtml/bodyText are absent, these links are scanned directly.
     */
    @Size(max = 50, message = "Cannot scan more than 50 links at once")
    private List<LinkItem> links;

    // ── Nested link item ──
    public static class LinkItem {
        private String href;
        private String text;

        public String getHref() { return href; }
        public void setHref(String href) { this.href = href; }
        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
    }

    /**
     * Returns true when the request has body content (HTML or plain text),
     * meaning a full email scan with AI/header checks should be performed.
     */
    public boolean hasBodyContent() {
        return (bodyHtml != null && !bodyHtml.isBlank())
            || (bodyText != null && !bodyText.isBlank());
    }

    /**
     * Returns true when the request has explicit links to scan.
     */
    public boolean hasLinks() {
        return links != null && !links.isEmpty();
    }

    // Getters and setters
    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public String getBodyHtml() {
        return bodyHtml;
    }

    public void setBodyHtml(String bodyHtml) {
        this.bodyHtml = bodyHtml;
    }

    public String getBodyText() {
        return bodyText;
    }

    public void setBodyText(String bodyText) {
        this.bodyText = bodyText;
    }

    public Map<String, List<String>> getHeaders() {
        return headers;
    }

    public void setHeaders(Map<String, List<String>> headers) {
        this.headers = headers;
    }

    public List<LinkItem> getLinks() {
        return links;
    }

    public void setLinks(List<LinkItem> links) {
        this.links = links;
    }
}