package com.newcafe.backend.dto.menus;

import com.newcafe.backend.entity.menu.Menu;

import java.time.Instant;

public record MenuResponse(
        Long id,
        String slug,
        String name,
        String description,
        String imageUrl,
        int price,
        Long categoryId,
        String categoryName,
        boolean available,
        boolean isNew,
        boolean recommended,
        boolean supportsHot,
        boolean supportsIced,
        Instant createdAt,
        Instant updatedAt
) {
    public static MenuResponse from(Menu menu) {
        return new MenuResponse(
                menu.getId(),
                menu.getSlug(),
                menu.getName(),
                menu.getDescription(),
                menu.getImageUrl(),
                menu.getPrice(),
                menu.getCategory().getId(),
                menu.getCategory().getName(),
                menu.isAvailable(),
                menu.isNew(),
                menu.isRecommended(),
                menu.isSupportsHot(),
                menu.isSupportsIced(),
                menu.getCreatedAt(),
                menu.getUpdatedAt()
        );
    }
}
