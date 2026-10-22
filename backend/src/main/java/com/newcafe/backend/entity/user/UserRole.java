package com.newcafe.backend.entity.user;

import com.fasterxml.jackson.annotation.JsonValue;

import jakarta.persistence.EnumeratedValue;

public enum UserRole {
    CUSTOMER("customer"),
    ADMIN("admin");

    @EnumeratedValue
    private final String value;

    UserRole(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
