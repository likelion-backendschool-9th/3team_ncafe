package com.newcafe.backend.common.error;

public class CartItemException extends RuntimeException {

    public enum Reason {
        NOT_FOUND,
        INVALID_INPUT,
        MENU_UNAVAILABLE
    }

    private final Reason reason;

    public CartItemException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public Reason getReason() {
        return reason;
    }
}
