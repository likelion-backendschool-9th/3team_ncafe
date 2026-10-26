package com.newcafe.backend.controller;

import com.newcafe.backend.dto.menus.MenuResponse;
import com.newcafe.backend.service.HomeService;

import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/index")
@RequiredArgsConstructor
public class HomeController {

    private final HomeService homeService;

    @GetMapping("/menus")
    public List<MenuResponse> menus() {
        return homeService.recommendedMenus();
    }
}
