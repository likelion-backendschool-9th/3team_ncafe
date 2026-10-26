package com.newcafe.backend.entity.user;

import com.fasterxml.jackson.annotation.JsonValue;

import jakarta.persistence.EnumeratedValue;

public enum UserStatus {
    ACTIVE("active"),
    SUSPENDED("suspended");

    @EnumeratedValue
    private final String value;

    UserStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
