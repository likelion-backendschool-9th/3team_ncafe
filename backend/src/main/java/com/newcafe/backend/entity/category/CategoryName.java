package com.newcafe.backend.entity.category;

public final class CategoryName {

    private CategoryName() {
    }

    public static String normalize(String name) {
        return name == null ? null : name.trim();
    }
}
