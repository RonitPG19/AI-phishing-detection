package com.phishing.scanner_app.model;

public enum Severity {
    LOW(5),
    MEDIUM(15),
    HIGH(25);

    private final int score;

    Severity(int score) {
        this.score = score;
    }

    public int score() {
        return score;
    }
}
