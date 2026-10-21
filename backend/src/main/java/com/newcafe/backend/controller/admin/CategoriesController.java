package com.newcafe.backend.controller.admin;

import com.newcafe.backend.dto.categories.CategoryOrderRequest;
import com.newcafe.backend.dto.categories.CategoryRequest;
import com.newcafe.backend.dto.categories.CategoryResponse;
import com.newcafe.backend.service.admin.CategoriesService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/categories")
public class CategoriesController {

    private final CategoriesService categoriesService;

    public CategoriesController(CategoriesService categoriesService) {
        this.categoriesService = categoriesService;
    }

    @GetMapping
    public List<CategoryResponse> list() {
        return categoriesService.list();
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryRequest request) {
        CategoryResponse category = categoriesService.create(request);
        return ResponseEntity.created(URI.create("/api/v1/admin/categories/" + category.id())).body(category);
    }

    @PutMapping("/{id}")
    public CategoryResponse rename(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return categoriesService.rename(id, request);
    }

    @PutMapping("/order")
    public List<CategoryResponse> reorder(@Valid @RequestBody CategoryOrderRequest request) {
        return categoriesService.reorder(request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        categoriesService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
