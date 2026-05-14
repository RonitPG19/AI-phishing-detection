package com.phishing.scanner_app.dto;

import java.util.List;

public record AttachmentScanResponse(
    String filename,
    String declaredMimeType,
    String detectedMimeType,
    String verdict,
    String predictedBehavior,
    String technicalReason,
    List<String> extractedUrls
) {
}
