package com.newcafe.backend.common.error;

import lombok.Getter;

@Getter
public class AdminOrderException extends RuntimeException {
    public enum Reason { NOT_FOUND, INVALID_STATUS, STALE_STATUS, UNAUTHORIZED, FORBIDDEN }

    private final Reason reason;

    public AdminOrderException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }
}
