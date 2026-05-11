package com.phishing.scanner_app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ScanSectionsResponse(
    @JsonProperty("Header") ScanCategoryResponse header,
    @JsonProperty("Subject") ScanCategoryResponse subject,
    @JsonProperty("Body") ScanCategoryResponse body,
    @JsonProperty("Links") ScanCategoryResponse links
) {
}
