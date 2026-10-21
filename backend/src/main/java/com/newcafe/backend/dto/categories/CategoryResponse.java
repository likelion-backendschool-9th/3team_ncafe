package com.newcafe.backend.dto.categories;

import com.newcafe.backend.entity.Category;
import java.time.Instant;

public record CategoryResponse(
        Long id,
        String name,
        int displayOrder,
        boolean isFallback,
        long menuCount,
        Instant createdAt,
        Instant updatedAt
) {
    public static CategoryResponse from(Category category, long menuCount) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getDisplayOrder(),
                category.isFallback(),
                menuCount,
                category.getCreatedAt(),
                category.getUpdatedAt()
        );
    }
}
