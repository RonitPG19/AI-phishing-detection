package com.phishing.scanner_app.model;

public final class EmailContent {
    private final StringBuilder html = new StringBuilder();
    private final StringBuilder text = new StringBuilder();

    public void appendHtml(String htmlPart) {
        html.append(htmlPart).append('\n');
    }

    public void appendText(String textPart) {
        text.append(textPart).append('\n');
    }

    public boolean hasHtml() {
        return !html.isEmpty();
    }

    public String getHtml() {
        return html.toString();
    }

    public String getText() {
        return text.toString();
    }
}
