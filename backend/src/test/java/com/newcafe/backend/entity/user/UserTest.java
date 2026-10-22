package com.newcafe.backend.entity.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Locale;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import tools.jackson.databind.json.JsonMapper;

class UserTest {

    private static final String HASH = "{bcrypt}$2a$10$" + "a".repeat(53);

    @Test
    void customerFactoryNormalizesFieldsAndAlwaysCreatesActiveCustomer() {
        User user = User.createCustomer("\u2003단골 고객\u2003", "\u2003Guest@EXAMPLE.COM\u2003", HASH);

        assertEquals("단골 고객", user.getName());
        assertEquals("guest@example.com", user.getEmail());
        assertEquals(UserRole.CUSTOMER, user.getRole());
        assertEquals(UserStatus.ACTIVE, user.getStatus());
    }

    @Test
    void emailNormalizationDoesNotDependOnDefaultLocale() {
        Locale original = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            assertEquals("i@example.com", UserFields.normalizeEmail("I@EXAMPLE.COM"));
        } finally {
            Locale.setDefault(original);
        }
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "guest", "guest@example", "guest@@example.com",
            "guest @example.com", "guest@example. com", "guest\u00a0@example.com"})
    void rejectsMissingOrInvalidEmail(String email) {
        assertThrows(IllegalArgumentException.class, () -> User.createCustomer("단골", email, HASH));
    }

    @Test
    void enforcesEmailLengthAfterNormalization() {
        assertEquals(254, UserFields.normalizeEmail("a".repeat(242) + "@example.com").length());
        assertThrows(IllegalArgumentException.class,
                () -> UserFields.normalizeEmail("a".repeat(243) + "@example.com"));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "가", "😀"})
    void rejectsNamesWithFewerThanTwoCodePoints(String name) {
        assertThrows(IllegalArgumentException.class, () -> User.createCustomer(name, "guest@example.com", HASH));
    }

    @Test
    void nameLengthCountsCodePointsInsteadOfUtf16Units() {
        assertEquals("😀😀", User.createCustomer("😀😀", "guest@example.com", HASH).getName());
        assertEquals("😀".repeat(50),
                User.createCustomer("😀".repeat(50), "guest@example.com", HASH).getName());
        assertThrows(IllegalArgumentException.class,
                () -> User.createCustomer("😀".repeat(51), "guest@example.com", HASH));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "plain-password", "{noop}plain-password",
            "$2a$10$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "{bcrypt}$2a$03$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"})
    void rejectsPlaintextAndInvalidEncodedPasswords(String hash) {
        assertThrows(IllegalArgumentException.class,
                () -> User.createCustomer("단골", "guest@example.com", hash));
    }

    @Test
    void serializationAndToStringDoNotExposePasswordHash() {
        User user = User.createCustomer("단골", "guest@example.com", HASH);
        String json = JsonMapper.builder().build().writeValueAsString(user);

        assertFalse(json.contains("password"));
        assertFalse(json.contains(HASH));
        assertFalse(user.toString().contains(HASH));
        assertEquals("customer", JsonMapper.builder().build().readTree(json).get("role").asText());
        assertEquals("active", JsonMapper.builder().build().readTree(json).get("status").asText());
    }
}
