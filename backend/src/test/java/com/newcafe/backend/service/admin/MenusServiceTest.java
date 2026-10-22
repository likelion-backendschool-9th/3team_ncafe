package com.newcafe.backend.service.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.newcafe.backend.common.error.MenuException;
import com.newcafe.backend.common.error.MenuException.Reason;
import com.newcafe.backend.dto.menus.MenuCreateRequest;
import com.newcafe.backend.dto.menus.MenuUpdateRequest;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.entity.menu.MenuDetails;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class MenusServiceTest {

    private CategoryRepository categoryRepository;
    private MenuRepository menuRepository;
    private MenusService service;

    @BeforeEach
    void setUp() {
        categoryRepository = org.mockito.Mockito.mock(CategoryRepository.class);
        menuRepository = org.mockito.Mockito.mock(MenuRepository.class);

        service = new MenusService(menuRepository, categoryRepository);
    }

    @Test
    void s4DuplicateSlugIsRejectedBeforeSaving() {
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category(10L, "커피")));
        when(menuRepository.existsBySlug("americano")).thenReturn(true);

        MenuException exception = assertThrows(MenuException.class, () -> service.create(request(10L)));

        assertEquals(Reason.CONFLICT, exception.getReason());
        verify(menuRepository, never()).save(any(Menu.class));
    }

    @Test
    void s5MissingCategoryIsInvalidInput() {
        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());

        MenuException exception = assertThrows(MenuException.class, () -> service.create(request(999L)));

        assertEquals(Reason.INVALID_INPUT, exception.getReason());
        verify(menuRepository, never()).save(any(Menu.class));
    }

    @Test
    void s13GetLooksUpOnlyMenusThatAreNotArchived() {
        when(menuRepository.findByIdAndArchivedAtIsNull(6L)).thenReturn(Optional.empty());

        MenuException exception = assertThrows(MenuException.class, () -> service.get(6L));

        assertEquals(Reason.NOT_FOUND, exception.getReason());
        verify(menuRepository, never()).findById(6L);
    }

    @Test
    void s14UpdateRefreshesUpdatedAt() {
        Instant before = Instant.parse("2026-10-01T00:00:00Z");
        Menu menu = Menu.create(category(10L, "커피"), "americano", new MenuDetails(
                "아메리카노", "진한 커피", "/images/menus/coffee.png", 4500, true, false, true, true, true));
        ReflectionTestUtils.setField(menu, "updatedAt", before);
        when(menuRepository.findByIdAndArchivedAtIsNull(5L)).thenReturn(Optional.of(menu));
        when(categoryRepository.findById(12L)).thenReturn(Optional.of(category(12L, "다과")));

        var response = service.update(5L, new MenuUpdateRequest(12L, "아메리카노", "진한 커피",
                "/images/menus/coffee.png", 5000, false, false, true, true, true));

        assertEquals(5000, response.price());
        assertTrue(response.updatedAt().isAfter(before));
    }

    private static MenuCreateRequest request(Long categoryId) {
        return new MenuCreateRequest(categoryId, "americano", "아메리카노", "진한 커피", "/images/menus/coffee.png",
                4500, true, false, true, true, true);
    }

    private static Category category(Long id, String name) {
        Category category = Category.create(name, 1);
        ReflectionTestUtils.setField(category, "id", id);
        return category;
    }
}
