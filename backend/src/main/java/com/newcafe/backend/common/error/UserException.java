package com.newcafe.backend.common.error;

public class UserException extends RuntimeException {

    public enum Reason {
        NOT_FOUND,
        CONFLICT,
        UNAUTHORIZED,
        FORBIDDEN
    }

    private final Reason reason;

    public UserException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public Reason getReason() {
        return reason;
    }
}
