package com.phishing.scanner_app.dto;

import jakarta.validation.constraints.NotNull;

public class CreateFlagRequest {

    @NotNull(message = "reasonCode is required")
    private ScanFlagReasonCode reasonCode;

    private String comment;

    public ScanFlagReasonCode getReasonCode() {
        return reasonCode;
    }

    public void setReasonCode(ScanFlagReasonCode reasonCode) {
        this.reasonCode = reasonCode;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
