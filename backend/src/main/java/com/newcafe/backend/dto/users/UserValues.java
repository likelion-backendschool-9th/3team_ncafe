package com.newcafe.backend.dto.users;

import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;

import java.util.Arrays;

// 요청의 소문자 값(active·customer 등)을 회원 enum으로 바꾼다. 값 검증은 각 DTO의 @Pattern이 먼저 한다.
final class UserValues {

    static final String STATUS_PATTERN = "active|suspended";
    static final String ROLE_PATTERN = "customer|admin";

    private UserValues() {
    }

    static UserStatus status(String value) {
        return Arrays.stream(UserStatus.values())
                .filter(status -> status.getValue().equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("알 수 없는 이용 상태입니다: " + value));
    }

    static UserRole role(String value) {
        return Arrays.stream(UserRole.values())
                .filter(role -> role.getValue().equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("알 수 없는 회원 권한입니다: " + value));
    }
}
