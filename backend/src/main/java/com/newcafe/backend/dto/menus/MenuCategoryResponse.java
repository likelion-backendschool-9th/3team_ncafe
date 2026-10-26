package com.newcafe.backend.dto.menus;

import com.newcafe.backend.entity.category.Category;

public record MenuCategoryResponse(
        Long id,
        String name
) {

    public static MenuCategoryResponse from(Category category) {
        return new MenuCategoryResponse(category.getId(), category.getName());
    }
}
