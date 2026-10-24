package com.newcafe.backend.entity.user;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Arrays;

public enum UserStatus {
    ACTIVE("active"),
    SUSPENDED("suspended");

    public static final String PATTERN = "active|suspended";

    private final String value;

    UserStatus(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static UserStatus from(String value) {
        return Arrays.stream(values())
                .filter(status -> status.value.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("알 수 없는 이용 상태입니다: " + value));
    }

    @Converter(autoApply = true)
    public static class DbConverter implements AttributeConverter<UserStatus, String> {

        @Override
        public String convertToDatabaseColumn(UserStatus status) {
            return status == null ? null : status.value;
        }

        @Override
        public UserStatus convertToEntityAttribute(String value) {
            return value == null ? null : from(value);
        }
    }
}
