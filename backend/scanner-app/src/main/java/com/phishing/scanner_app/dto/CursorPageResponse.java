package com.phishing.scanner_app.dto;

import java.util.List;

public record CursorPageResponse<T>(
    List<T> items,
    String nextCursor
) {
}
