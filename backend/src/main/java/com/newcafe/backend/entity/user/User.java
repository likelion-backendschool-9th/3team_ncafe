package com.newcafe.backend.entity.user;

import com.newcafe.backend.common.error.UserException;
import com.newcafe.backend.common.error.UserException.Reason;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import java.time.Instant;
import java.util.Locale;
import java.util.Objects;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    public static final int EMAIL_MAX_LENGTH = 254;
    public static final int NAME_MAX_LENGTH = 40;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 관리자 목록 정렬용. DB 기본 정렬 규칙(en_US 등)은 한글을 가나다순으로 정렬하지 못해 "C"(코드 순서)로 고정한다.
    @Column(nullable = false, unique = true, columnDefinition = "varchar(" + EMAIL_MAX_LENGTH + ") collate \"C\"")
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false, columnDefinition = "varchar(" + NAME_MAX_LENGTH + ") collate \"C\"")
    private String name;

    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(nullable = false, length = 20)
    private UserStatus status;

    @Column(nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant createdAt;

    @Column(nullable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant updatedAt;

    private User(String email, String passwordHash, String name, UserRole role) {
        this.email = normalizeEmail(email);
        this.passwordHash = requireText(passwordHash, Integer.MAX_VALUE, "비밀번호 해시가 필요합니다.");
        this.name = requireText(name, NAME_MAX_LENGTH, "닉네임은 1~40자로 입력해 주세요.");
        this.role = Objects.requireNonNull(role);
        this.status = UserStatus.ACTIVE;
    }

    public static User create(String email, String passwordHash, String name, UserRole role) {
        return new User(email, passwordHash, name, role);
    }

    public boolean isAdmin() {
        return role == UserRole.ADMIN;
    }

    public void changeStatus(UserStatus status) {
        Objects.requireNonNull(status);

        if (isAdmin()) {
            throw new UserException(Reason.CONFLICT, "관리자 계정의 상태는 변경할 수 없습니다.");
        }

        if (this.status == status) {
            return;
        }

        this.status = status;
        updatedAt = Instant.now();
    }

    private static String normalizeEmail(String email) {
        String normalized = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
        if (normalized == null || normalized.isEmpty() || normalized.length() > EMAIL_MAX_LENGTH) {
            throw new IllegalArgumentException("이메일을 확인해 주세요.");
        }

        return normalized;
    }

    private static String requireText(String value, int maxLength, String message) {
        String normalized = value == null ? null : value.trim();
        if (normalized == null || normalized.isEmpty() || normalized.length() > maxLength) {
            throw new IllegalArgumentException(message);
        }

        return normalized;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();

        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
