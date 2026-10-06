package com.newcafe.backend.controller.admin;

import com.newcafe.backend.entity.Menu;
import com.newcafe.backend.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/menus")
@RequiredArgsConstructor

public class AdminMenuController {
    private final MenuRepository menuRepository;

    @PostMapping
    public Menu createMenu(@RequestBody Menu menu) {
        return menuRepository.save(menu);
    }

    @GetMapping
    public List<Menu> findAllMenus() {
        return menuRepository.findAll();
    }
}

