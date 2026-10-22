package com.newcafe.backend.dto.menus;

import com.newcafe.backend.entity.Menu;

import java.util.List;

import org.springframework.data.domain.Page;

public record MenuPageResponse(
        List<MenuResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public static MenuPageResponse from(Page<Menu> menus) {
        return new MenuPageResponse(
                menus.map(MenuResponse::from).getContent(),
                menus.getNumber(),
                menus.getSize(),
                menus.getTotalElements(),
                menus.getTotalPages()
        );
    }
}
