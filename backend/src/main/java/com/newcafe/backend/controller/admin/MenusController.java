package com.newcafe.backend.controller.admin;

import com.newcafe.backend.dto.menus.MenuCreateRequest;
import com.newcafe.backend.dto.menus.MenuResponse;
import com.newcafe.backend.service.admin.MenusService;

import jakarta.validation.Valid;

import java.net.URI;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("adminMenusController")
@RequestMapping("/api/v1/admin/menus")
@RequiredArgsConstructor
public class MenusController {

    private final MenusService menusService;

    @GetMapping("/{id}")
    public MenuResponse get(@PathVariable Long id) {
        return menusService.get(id);
    }

    @PostMapping
    public ResponseEntity<MenuResponse> create(@Valid @RequestBody MenuCreateRequest request) {
        MenuResponse menu = menusService.create(request);

        return ResponseEntity.created(URI.create("/api/v1/admin/menus/" + menu.id())).body(menu);
    }
}
