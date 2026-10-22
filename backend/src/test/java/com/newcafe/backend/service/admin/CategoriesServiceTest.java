package com.newcafe.backend.service.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.newcafe.backend.common.error.CategoryException;
import com.newcafe.backend.common.error.CategoryException.Reason;
import com.newcafe.backend.dto.categories.CategoryOrderRequest;
import com.newcafe.backend.dto.categories.CategoryRequest;
import com.newcafe.backend.entity.Category;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class CategoriesServiceTest {

    private CategoryRepository categoryRepository;
    private MenuRepository menuRepository;
    private CategoriesService service;

    @BeforeEach
    void setUp() {
        categoryRepository = org.mockito.Mockito.mock(CategoryRepository.class);
        menuRepository = org.mockito.Mockito.mock(MenuRepository.class);

        service = new CategoriesService(categoryRepository, menuRepository);
    }

    @Test
    void listReturnsMenuCountsWithOneAggregateQuery() {
        Category coffee = category(10L, "커피", 1);
        Category fallback = fallback(1L, 2);
        MenuRepository.CategoryMenuCount coffeeCount = org.mockito.Mockito.mock(MenuRepository.CategoryMenuCount.class);

        when(coffeeCount.getCategoryId()).thenReturn(10L);
        when(coffeeCount.getMenuCount()).thenReturn(2L);
        when(categoryRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(coffee, fallback));
        when(menuRepository.countByCategory()).thenReturn(List.of(coffeeCount));

        var responses = service.list();

        assertEquals(List.of(10L, 1L), responses.stream().map(response -> response.id()).toList());
        assertEquals(List.of(2L, 0L), responses.stream().map(response -> response.menuCount()).toList());

        verify(menuRepository).countByCategory();
        verify(menuRepository, never()).countByCategory_Id(10L);
    }

    @Test
    void reorderUsesTemporaryOrdersBeforeFinalOrders() {
        Category coffee = category(10L, "커피", 1);
        Category tea = category(11L, "차", 2);
        Category fallback = fallback(1L, 3);
        when(categoryRepository.findFallbackForUpdate()).thenReturn(Optional.of(fallback));
        when(categoryRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(coffee, tea, fallback));

        service.reorder(new CategoryOrderRequest(List.of(11L, 10L, 1L)));

        assertEquals(2, coffee.getDisplayOrder());
        assertEquals(1, tea.getDisplayOrder());
        assertEquals(3, fallback.getDisplayOrder());

        verify(categoryRepository, times(2)).flush();
    }

    @Test
    void staleReorderDoesNotWriteOrders() {
        Category fallback = fallback(1L, 1);
        Category coffee = category(10L, "커피", 2);
        when(categoryRepository.findFallbackForUpdate()).thenReturn(Optional.of(fallback));
        when(categoryRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(fallback, coffee));

        CategoryException exception = assertThrows(CategoryException.class,
                () -> service.reorder(new CategoryOrderRequest(List.of(1L))));

        assertEquals(Reason.CONFLICT, exception.getReason());

        org.mockito.Mockito.verify(categoryRepository, org.mockito.Mockito.never()).flush();
    }

    @Test
    void protectedFallbackNameCannotBeCreatedAgain() {
        Category fallback = fallback(1L, 1);
        when(categoryRepository.findFallbackForUpdate()).thenReturn(Optional.of(fallback));
        when(categoryRepository.existsByName(Category.FALLBACK_NAME)).thenReturn(true);

        CategoryException exception = assertThrows(CategoryException.class,
                () -> service.create(new CategoryRequest(" 기타 ")));

        assertEquals(Reason.CONFLICT, exception.getReason());

        org.mockito.Mockito.verify(categoryRepository, org.mockito.Mockito.never())
                .saveAndFlush(org.mockito.ArgumentMatchers.any(Category.class));
    }

    @Test
    void protectedFallbackCannotBeRenamed() {
        Category fallback = fallback(1L, 1);
        when(categoryRepository.findFallbackForUpdate()).thenReturn(Optional.of(fallback));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(fallback));

        CategoryException exception = assertThrows(CategoryException.class,
                () -> service.rename(1L, new CategoryRequest("커피")));

        assertEquals(Reason.CONFLICT, exception.getReason());
        assertEquals(Category.FALLBACK_NAME, fallback.getName());

        verify(categoryRepository, never()).flush();
    }

    @Test
    void fallbackNameCannotBeUsedForRename() {
        Category fallback = fallback(1L, 1);
        Category coffee = category(10L, "커피", 2);
        when(categoryRepository.findFallbackForUpdate()).thenReturn(Optional.of(fallback));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(coffee));
        when(categoryRepository.existsByNameAndIdNot(Category.FALLBACK_NAME, 10L)).thenReturn(true);

        CategoryException exception = assertThrows(CategoryException.class,
                () -> service.rename(10L, new CategoryRequest("기타")));

        assertEquals(Reason.CONFLICT, exception.getReason());
        assertEquals("커피", coffee.getName());

        verify(categoryRepository, never()).flush();
    }

    @Test
    void deleteMovesMenusBeforeRemovingCategory() {
        Category fallback = fallback(1L, 1);
        Category coffee = category(10L, "커피", 2);
        Category tea = category(11L, "차", 3);
        when(categoryRepository.findFallbackForUpdate()).thenReturn(Optional.of(fallback));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(coffee));
        when(categoryRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(fallback, tea));

        service.delete(10L);

        org.mockito.InOrder order = org.mockito.Mockito.inOrder(menuRepository, categoryRepository);
        order.verify(menuRepository).moveToCategory(coffee, fallback);
        order.verify(categoryRepository).delete(coffee);

        assertEquals(2, tea.getDisplayOrder());
        verify(categoryRepository, times(3)).flush();
    }

    private Category category(Long id, String name, int order) {
        Category category = Category.create(name, order);

        ReflectionTestUtils.setField(category, "id", id);
        return category;
    }

    private Category fallback(Long id, int order) {
        Category category = Category.createFallback(order);

        ReflectionTestUtils.setField(category, "id", id);
        return category;
    }
}
