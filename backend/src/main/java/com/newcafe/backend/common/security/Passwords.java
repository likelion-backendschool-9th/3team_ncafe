package com.newcafe.backend.common.security;

import java.nio.charset.StandardCharsets;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class Passwords {

    private static final int MIN_CODE_POINTS = 8;
    private static final int MAX_UTF8_BYTES = 72;

    private final PasswordEncoder passwordEncoder;

    public Passwords(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    public String encode(String rawPassword) {
        if (!isValid(rawPassword)) {
            throw new IllegalArgumentException("비밀번호는 8자 이상, UTF-8 기준 72바이트 이하로 입력해 주세요.");
        }
        return passwordEncoder.encode(rawPassword);
    }

    public boolean matches(String rawPassword, String encodedPassword) {
        if (!isValid(rawPassword) || encodedPassword == null || !encodedPassword.startsWith("{bcrypt}")) {
            return false;
        }
        try {
            return passwordEncoder.matches(rawPassword, encodedPassword);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static boolean isValid(String rawPassword) {
        return rawPassword != null
                && rawPassword.codePointCount(0, rawPassword.length()) >= MIN_CODE_POINTS
                && rawPassword.codePoints().noneMatch(value ->
                        value >= Character.MIN_SURROGATE && value <= Character.MAX_SURROGATE)
                && rawPassword.getBytes(StandardCharsets.UTF_8).length <= MAX_UTF8_BYTES;
    }
}
