package com.newcafe.backend.entity;

import com.newcafe.backend.common.error.CategoryException;
import com.newcafe.backend.common.error.CategoryException.Reason;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import java.time.Instant;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Category {

    public static final String FALLBACK_NAME = "기타";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String name;

    @Column(nullable = false, unique = true)
    private int displayOrder;

    @Column(nullable = false)
    private boolean isFallback;

    @Column(nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant createdAt;

    @Column(nullable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant updatedAt;

    private Category(String name, int displayOrder, boolean fallback) {
        this.name = normalizeName(name);

        if (displayOrder < 1) {
            throw new IllegalArgumentException("표시 순서는 1 이상이어야 합니다.");
        }

        if (fallback != FALLBACK_NAME.equals(this.name)) {
            throw new IllegalArgumentException("기타 카테고리의 보호 상태가 올바르지 않습니다.");
        }

        this.displayOrder = displayOrder;
        this.isFallback = fallback;
    }

    public static Category create(String name, int displayOrder) {
        return new Category(name, displayOrder, false);
    }

    public static Category createFallback(int displayOrder) {
        return new Category(FALLBACK_NAME, displayOrder, true);
    }

    public void rename(String name) {
        if (isFallback) {
            throw new CategoryException(Reason.CONFLICT, "기타 카테고리는 수정할 수 없습니다.");
        }

        String normalized = normalizeName(name);
        if (FALLBACK_NAME.equals(normalized)) {
            throw new CategoryException(Reason.CONFLICT, "기타는 보호된 카테고리 이름입니다.");
        }

        this.name = normalized;
    }

    public void changeDisplayOrder(int displayOrder) {
        if (displayOrder < 1) {
            throw new IllegalArgumentException("표시 순서는 1 이상이어야 합니다.");
        }

        this.displayOrder = displayOrder;
    }

    private static String normalizeName(String name) {
        if (name == null) {
            throw new IllegalArgumentException("카테고리명을 입력해 주세요.");
        }

        String normalized = CategoryName.normalize(name);
        if (normalized.isEmpty() || normalized.length() > 40) {
            throw new IllegalArgumentException("카테고리명은 1~40자로 입력해 주세요.");
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
