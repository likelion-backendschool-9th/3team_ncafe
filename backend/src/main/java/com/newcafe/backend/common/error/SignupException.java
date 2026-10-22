package com.newcafe.backend.common.error;

public class SignupException extends RuntimeException {

    public enum Reason {
        VALIDATION_ERROR,
        EMAIL_ALREADY_EXISTS
    }

    private final Reason reason;

    public SignupException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public Reason getReason() {
        return reason;
    }
}
