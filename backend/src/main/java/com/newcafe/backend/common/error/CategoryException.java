package com.newcafe.backend.common.error;

public class CategoryException extends RuntimeException {

    public enum Reason {
        NOT_FOUND,
        CONFLICT,
        INVALID_ORDER
    }

    private final Reason reason;

    public CategoryException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public Reason getReason() {
        return reason;
    }
}
