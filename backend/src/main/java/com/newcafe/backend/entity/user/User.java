package com.newcafe.backend.entity.user;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.newcafe.backend.common.error.UserException;
import com.newcafe.backend.common.error.UserException.Reason;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.Objects;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(name = "uk_users_email", columnNames = "email"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = UserFields.EMAIL_MAX_LENGTH)
    private String email;

    @JsonIgnore
    @Column(nullable = false, length = 100)
    private String passwordHash;

    @Column(nullable = false, length = UserFields.NAME_MAX_LENGTH)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private UserStatus status;

    @Column(nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant createdAt;

    @Column(nullable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant updatedAt;

    private User(String name, String email, String passwordHash) {
        this.name = UserFields.normalizeName(name);
        this.email = UserFields.normalizeEmail(email);
        this.passwordHash = UserFields.requirePasswordHash(passwordHash);
        this.role = UserRole.CUSTOMER;
        this.status = UserStatus.ACTIVE;
    }

    public static User createCustomer(String name, String email, String passwordHash) {
        return new User(name, email, passwordHash);
    }

    public boolean isAdmin() {
        return role == UserRole.ADMIN;
    }

    // 관리자 회원관리의 이용 정지·해제. 관리자 계정의 상태는 바꾸지 않는다 (DB 설계).
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
