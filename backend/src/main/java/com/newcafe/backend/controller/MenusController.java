package com.newcafe.backend.controller;

import com.newcafe.backend.dto.menus.MenuCategoryResponse;
import com.newcafe.backend.dto.menus.MenuPageResponse;
import com.newcafe.backend.dto.menus.MenuResponse;
import com.newcafe.backend.dto.menus.MenuSearchRequest;
import com.newcafe.backend.service.MenusService;

import jakarta.validation.Valid;

import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("publicMenusController")
@RequestMapping("/api/v1/menus")
@RequiredArgsConstructor
public class MenusController {

    private final MenusService menusService;

    @GetMapping
    public MenuPageResponse list(@Valid @ModelAttribute MenuSearchRequest request) {
        return menusService.list(request);
    }

    @GetMapping("/categories")
    public List<MenuCategoryResponse> categories() {
        return menusService.categories();
    }

    @GetMapping("/{slug}")
    public MenuResponse get(@PathVariable String slug) {
        return menusService.get(slug);
    }
}
