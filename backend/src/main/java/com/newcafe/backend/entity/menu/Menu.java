package com.newcafe.backend.entity.menu;

import com.newcafe.backend.entity.category.Category;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import java.time.Instant;
import java.util.Objects;
import java.util.regex.Pattern;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Menu {

    private static final Pattern SLUG = Pattern.compile(MenuFields.SLUG_PATTERN);
    private static final Pattern IMAGE_URL = Pattern.compile(MenuFields.IMAGE_URL_PATTERN);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(nullable = false)
    private Category category;

    @Column(nullable = false, unique = true, updatable = false, length = MenuFields.SLUG_MAX_LENGTH)
    private String slug;

    @Column(nullable = false, length = MenuFields.NAME_MAX_LENGTH)
    private String name;

    @Column(nullable = false, length = MenuFields.DESCRIPTION_MAX_LENGTH)
    private String description;

    @Column(nullable = false, length = MenuFields.IMAGE_URL_MAX_LENGTH)
    private String imageUrl;

    @Column(nullable = false)
    private int price;

    @Column(nullable = false)
    private boolean available;

    @Column(nullable = false)
    private boolean isNew;

    @Column(nullable = false)
    private boolean recommended;

    @Column(nullable = false)
    private boolean supportsHot;

    @Column(nullable = false)
    private boolean supportsIced;

    @Column(columnDefinition = "TIMESTAMPTZ")
    private Instant archivedAt;

    @Column(nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant createdAt;

    @Column(nullable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant updatedAt;

    private Menu(Category category, String slug, MenuDetails details) {
        this.slug = normalizeSlug(slug);
        apply(category, details);
    }

    public static Menu create(Category category, String slug, MenuDetails details) {
        return new Menu(category, slug, details);
    }

    public void update(Category category, MenuDetails details) {
        apply(category, details);
    }

    public void archive() {
        if (archivedAt != null) {
            return;
        }

        available = false;
        archivedAt = Instant.now();
    }

    public boolean isArchived() {
        return archivedAt != null;
    }

    private void apply(Category category, MenuDetails details) {
        Objects.requireNonNull(details);

        this.category = Objects.requireNonNull(category);
        this.name = requireText(details.name(), MenuFields.NAME_MAX_LENGTH, "메뉴명은 1~80자로 입력해 주세요.");
        this.description = requireText(details.description(), MenuFields.DESCRIPTION_MAX_LENGTH,
                "설명은 1~500자로 입력해 주세요.");
        this.imageUrl = normalizeImageUrl(details.imageUrl());
        this.price = requirePrice(details.price());
        this.available = details.available();
        this.isNew = details.isNew();
        this.recommended = details.recommended();
        this.supportsHot = details.supportsHot();
        this.supportsIced = details.supportsIced();
    }

    private static String normalizeSlug(String slug) {
        String normalized = MenuFields.normalize(slug);
        if (normalized == null || normalized.length() > MenuFields.SLUG_MAX_LENGTH
                || !SLUG.matcher(normalized).matches()) {
            throw new IllegalArgumentException("slug는 소문자·숫자·하이픈으로 1~100자 입력해 주세요.");
        }

        return normalized;
    }

    private static String normalizeImageUrl(String imageUrl) {
        String normalized = MenuFields.normalize(imageUrl);
        if (normalized == null || normalized.length() > MenuFields.IMAGE_URL_MAX_LENGTH
                || !IMAGE_URL.matcher(normalized).matches()) {
            throw new IllegalArgumentException("HTTPS 이미지 주소나 /images/menus/ 경로를 입력해 주세요.");
        }

        return normalized;
    }

    private static String requireText(String value, int maxLength, String message) {
        String normalized = MenuFields.normalize(value);
        if (normalized == null || normalized.isEmpty() || normalized.length() > maxLength) {
            throw new IllegalArgumentException(message);
        }

        return normalized;
    }

    private static int requirePrice(int price) {
        if (price < MenuFields.PRICE_MIN || price > MenuFields.PRICE_MAX) {
            throw new IllegalArgumentException("가격은 1~1,000,000원 사이의 정수로 입력해 주세요.");
        }

        return price;
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
