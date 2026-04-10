package com.phishing.scanner_app;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request DTO for link-only scanning.
 * Accepts a list of URLs to check for phishing indicators.
 */
public class LinkScanRequest {

    @NotEmpty(message = "At least one URL is required")
    @Size(max = 50, message = "Cannot scan more than 50 URLs at once")
    private List<String> urls;

    public List<String> getUrls() {
        return urls;
    }

    public void setUrls(List<String> urls) {
        this.urls = urls;
    }
}
