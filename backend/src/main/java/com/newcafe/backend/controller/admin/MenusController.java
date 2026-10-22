package com.newcafe.backend.controller.admin;

import com.newcafe.backend.dto.menus.MenuCreateRequest;
import com.newcafe.backend.dto.menus.MenuPageResponse;
import com.newcafe.backend.dto.menus.MenuResponse;
import com.newcafe.backend.dto.menus.MenuSearchRequest;
import com.newcafe.backend.dto.menus.MenuUpdateRequest;
import com.newcafe.backend.service.admin.MenusService;

import jakarta.validation.Valid;

import java.net.URI;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("adminMenusController")
@RequestMapping("/api/v1/admin/menus")
@RequiredArgsConstructor
public class MenusController {

    private final MenusService menusService;

    @GetMapping
    public MenuPageResponse list(@Valid @ModelAttribute MenuSearchRequest request) {
        return menusService.list(request);
    }

    @GetMapping("/{id}")
    public MenuResponse get(@PathVariable Long id) {
        return menusService.get(id);
    }

    @PostMapping
    public ResponseEntity<MenuResponse> create(@Valid @RequestBody MenuCreateRequest request) {
        MenuResponse menu = menusService.create(request);

        return ResponseEntity.created(URI.create("/api/v1/admin/menus/" + menu.id())).body(menu);
    }

    @PutMapping("/{id}")
    public MenuResponse update(@PathVariable Long id, @Valid @RequestBody MenuUpdateRequest request) {
        return menusService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        menusService.delete(id);

        return ResponseEntity.noContent().build();
    }
}
