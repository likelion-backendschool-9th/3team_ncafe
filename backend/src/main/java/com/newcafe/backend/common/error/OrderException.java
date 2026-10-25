package com.newcafe.backend.common.error;

public class OrderException extends RuntimeException {

    public enum Reason {
        NOT_FOUND,
        INVALID_INPUT,
        CONFLICT,
        CART_ITEM_NOT_FOUND,
        MENU_UNAVAILABLE
    }

    private final Reason reason;

    public OrderException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public Reason getReason() {
        return reason;
    }
}
