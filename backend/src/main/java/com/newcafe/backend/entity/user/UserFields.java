package com.newcafe.backend.entity.user;

import java.util.Locale;
import java.util.regex.Pattern;

public final class UserFields {

    public static final int EMAIL_MAX_LENGTH = 254;
    public static final int NAME_MAX_LENGTH = 50;

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
            Pattern.UNICODE_CHARACTER_CLASS);
    private static final Pattern BCRYPT_HASH = Pattern.compile(
            "\\{bcrypt\\}\\$2[aby]\\$(0[4-9]|[12][0-9]|3[01])\\$[./A-Za-z0-9]{53}");

    private UserFields() {
    }

    public static String normalizeEmail(String value) {
        if (value == null) {
            throw new IllegalArgumentException("이메일을 입력해 주세요.");
        }

        String normalized = value.strip().toLowerCase(Locale.ROOT);
        if (normalized.length() > EMAIL_MAX_LENGTH || !EMAIL.matcher(normalized).matches()) {
            throw new IllegalArgumentException("이메일 형식과 최대 254자 제한을 확인해 주세요.");
        }
        return normalized;
    }

    static String normalizeName(String value) {
        if (value == null) {
            throw new IllegalArgumentException("이름을 입력해 주세요.");
        }

        String normalized = value.strip();
        int length = normalized.codePointCount(0, normalized.length());
        if (length < 2 || length > NAME_MAX_LENGTH) {
            throw new IllegalArgumentException("이름은 2~50자로 입력해 주세요.");
        }
        return normalized;
    }

    static String requirePasswordHash(String value) {
        if (value == null || !BCRYPT_HASH.matcher(value).matches()) {
            throw new IllegalArgumentException("인코딩된 비밀번호 형식을 확인해 주세요.");
        }
        return value;
    }
}
