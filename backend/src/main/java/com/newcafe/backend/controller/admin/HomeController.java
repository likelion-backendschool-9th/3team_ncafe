package com.newcafe.backend.controller.admin;

import com.newcafe.backend.dto.menus.MenuSummaryResponse;
import com.newcafe.backend.service.admin.HomeService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("adminHomeController")
@RequestMapping("/api/v1/admin/index")
@RequiredArgsConstructor
public class HomeController {

    private final HomeService homeService;

    @GetMapping("/menus")
    public MenuSummaryResponse menus() {
        return homeService.menuSummary();
    }
}
