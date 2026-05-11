package com.phishing.scanner_app.model;

public final class HeaderInspectionResult {
    public boolean spfFail;
    public boolean dkimFail;
    public boolean dmarcFail;
    public boolean displayNameMismatch;
    public boolean replyToMismatch;
    public boolean returnPathMismatch;
}
