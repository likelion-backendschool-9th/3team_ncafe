package com.newcafe.backend.entity.menu;

public record MenuDetails(
        String name,
        String description,
        String imageUrl,
        int price,
        boolean available,
        boolean isNew,
        boolean recommended,
        boolean supportsHot,
        boolean supportsIced
) {
}
