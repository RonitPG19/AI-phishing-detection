package com.phishing.scanner_app.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public final class CategorizedFindings {
    private final CategoryResult header = new CategoryResult();
    private final CategoryResult subject = new CategoryResult();
    private final CategoryResult body = new CategoryResult();
    private final CategoryResult links = new CategoryResult();

    @JsonProperty("Header")
    public CategoryResult header() { return header; }

    @JsonProperty("Subject")
    public CategoryResult subject() { return subject; }

    @JsonProperty("Body")
    public CategoryResult body() { return body; }

    @JsonProperty("Links")
    public CategoryResult links() { return links; }
}
