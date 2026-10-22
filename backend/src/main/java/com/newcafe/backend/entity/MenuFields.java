package com.newcafe.backend.entity;

public final class MenuFields {

    public static final int SLUG_MAX_LENGTH = 100;
    public static final String SLUG_PATTERN = "^[a-z0-9]+(-[a-z0-9]+)*$";
    public static final int NAME_MAX_LENGTH = 80;
    public static final int DESCRIPTION_MAX_LENGTH = 500;
    public static final int IMAGE_URL_MAX_LENGTH = 2048;
    public static final String IMAGE_URL_PATTERN =
            "^(https://\\S+|/images/menus/[a-zA-Z0-9/_-]+\\.(svg|png|jpe?g|webp))$";
    public static final int PRICE_MIN = 1;
    public static final int PRICE_MAX = 1_000_000;

    private MenuFields() {
    }

    public static String normalize(String value) {
        return value == null ? null : value.trim();
    }
}
