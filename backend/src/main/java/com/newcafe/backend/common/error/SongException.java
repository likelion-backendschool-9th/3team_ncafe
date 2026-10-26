package com.newcafe.backend.common.error;

public class SongException extends RuntimeException {

    public enum Reason {
        NOT_FOUND,
        CONFLICT,
        INVALID_INPUT
    }

    private final Reason reason;

    public SongException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public Reason getReason() {
        return reason;
    }
}
