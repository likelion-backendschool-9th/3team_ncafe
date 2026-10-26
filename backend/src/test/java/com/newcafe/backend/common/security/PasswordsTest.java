package com.newcafe.backend.common.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.newcafe.backend.config.PasswordConfig;

import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

class PasswordsTest {

    private final Passwords passwords = new Passwords(new PasswordConfig().passwordEncoder());

    @ParameterizedTest
    @MethodSource("validPasswords")
    void encodesAndVerifiesPasswordsAtCharacterAndByteBoundaries(String rawPassword) {
        String encoded = passwords.encode(rawPassword);

        assertTrue(encoded.startsWith("{bcrypt}"));
        assertNotEquals(rawPassword, encoded);
        assertTrue(passwords.matches(rawPassword, encoded));
        assertFalse(passwords.matches("wrong-password", encoded));
    }

    static Stream<String> validPasswords() {
        return Stream.of("a".repeat(8), "a".repeat(72), "가".repeat(24), "😀".repeat(8), "😀".repeat(18));
    }

    @ParameterizedTest
    @MethodSource("invalidPasswords")
    void rejectsInvalidPasswordsBeforeHashingOrMatching(String rawPassword) {
        assertThrows(IllegalArgumentException.class, () -> passwords.encode(rawPassword));
        assertFalse(passwords.matches(rawPassword, "{bcrypt}invalid"));
    }

    static Stream<String> invalidPasswords() {
        return Stream.of(null, "", "a".repeat(7), "a".repeat(73), "가".repeat(25), "😀".repeat(7), "😀".repeat(19),
                "abcdefg\uD800", "abcdefg\uDC00");
    }

    @Test
    void preservesLeadingAndTrailingPasswordWhitespace() {
        String rawPassword = " password123 ";
        String encoded = passwords.encode(rawPassword);

        assertTrue(passwords.matches(rawPassword, encoded));
        assertFalse(passwords.matches(rawPassword.strip(), encoded));
    }

    @Test
    void usesDifferentSaltsForTheSamePassword() {
        assertNotEquals(passwords.encode("password123"), passwords.encode("password123"));
    }

    @Test
    void rejectsNullOrNonBcryptEncodedValues() {
        assertFalse(passwords.matches("password123", null));
        assertFalse(passwords.matches("password123", "password123"));
        assertFalse(passwords.matches("password123", "{noop}password123"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{bcrypt}invalid",
            "{bcrypt}$2a$03$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "{bcrypt}$2a$99$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"})
    void rejectsMalformedBcryptValuesWithoutThrowing(String encodedPassword) {
        assertFalse(passwords.matches("password123", encodedPassword));
    }
}
