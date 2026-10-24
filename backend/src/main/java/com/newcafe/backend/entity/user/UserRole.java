package com.newcafe.backend.entity.user;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Arrays;

public enum UserRole {
    CUSTOMER("customer"),
    ADMIN("admin");

    public static final String PATTERN = "customer|admin";

    private final String value;

    UserRole(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static UserRole from(String value) {
        return Arrays.stream(values())
                .filter(role -> role.value.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("알 수 없는 회원 권한입니다: " + value));
    }

    @Converter(autoApply = true)
    public static class DbConverter implements AttributeConverter<UserRole, String> {

        @Override
        public String convertToDatabaseColumn(UserRole role) {
            return role == null ? null : role.value;
        }

        @Override
        public UserRole convertToEntityAttribute(String value) {
            return value == null ? null : from(value);
        }
    }
}
