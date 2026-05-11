package com.phishing.scanner_app.dto;

import java.util.List;
import java.util.Map;

public record ScanCategoryResponse(
    List<ScanFindingResponse> findings,
    Map<String, Integer> scoreBreakdown
) {
}
