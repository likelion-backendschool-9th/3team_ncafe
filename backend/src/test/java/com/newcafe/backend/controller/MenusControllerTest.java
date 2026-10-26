package com.newcafe.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.error.ApiExceptionHandler;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.entity.menu.MenuDetails;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.service.MenusService;

import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class MenusControllerTest {

    private CategoryRepository categoryRepository;
    private MenuRepository menuRepository;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        categoryRepository = org.mockito.Mockito.mock(CategoryRepository.class);
        menuRepository = org.mockito.Mockito.mock(MenuRepository.class);

        MenusService menusService = new MenusService(menuRepository, categoryRepository);
        mockMvc = MockMvcBuilders.standaloneSetup(new MenusController(menusService))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void s1DefaultListReturnsFirstPageOfNewestMenus() throws Exception {
        listReturns(20, 25);

        mockMvc.perform(get("/api/v1/menus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(20))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(25))
                .andExpect(jsonPath("$.totalPages").value(2));

        assertEquals(0, capturedPageable().getPageNumber());
        assertEquals(20, capturedPageable().getPageSize());
        assertEquals(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")), capturedPageable().getSort());
    }

    @Test
    void s2FilterConditionsAreAccepted() throws Exception {
        listReturns(1, 1);

        mockMvc.perform(get("/api/v1/menus").param("q", "라떼").param("categoryId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1));
    }

    @Test
    void s3PriceLowSortsByPriceAscending() throws Exception {
        listReturns(3, 3);

        mockMvc.perform(get("/api/v1/menus").param("sort", "price-low"))
                .andExpect(status().isOk());

        assertEquals(Sort.by(Sort.Order.asc("price"), Sort.Order.asc("id")), capturedPageable().getSort());
    }

    static Stream<String> invalidListConditions() {
        return Stream.of("sort=cheap", "status=sold", "page=-1", "size=0", "size=101", "q=" + "가".repeat(101));
    }

    @ParameterizedTest
    @MethodSource("invalidListConditions")
    @SuppressWarnings("unchecked")
    void s4InvalidListConditionReturnsBadRequest(String condition) throws Exception {
        String[] pair = condition.split("=", 2);

        mockMvc.perform(get("/api/v1/menus").param(pair[0], pair[1]))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        verify(menuRepository, never()).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void s5CategoriesReturnIdAndNameInDisplayOrder() throws Exception {
        when(categoryRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(
                category(1L, "커피"), category(2L, "차"), fallbackCategory(3L)));

        mockMvc.perform(get("/api/v1/menus/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("커피"))
                .andExpect(jsonPath("$[1].name").value("차"))
                .andExpect(jsonPath("$[2].name").value("기타"))
                .andExpect(jsonPath("$[0].menuCount").doesNotExist())
                .andExpect(jsonPath("$[0].isFallback").doesNotExist())
                .andExpect(jsonPath("$[0].createdAt").doesNotExist());
    }

    @Test
    void s6CategoriesPathIsNotTreatedAsSlug() throws Exception {
        when(categoryRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/menus/categories"))
                .andExpect(status().isOk());

        verify(menuRepository, never()).findBySlugAndArchivedAtIsNull(anyString());
    }

    @Test
    void s7GetBySlugReturnsAllMenuFields() throws Exception {
        when(menuRepository.findBySlugAndArchivedAtIsNull("americano")).thenReturn(Optional.of(menu(true)));

        mockMvc.perform(get("/api/v1/menus/americano"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.slug").value("americano"))
                .andExpect(jsonPath("$.name").value("아메리카노"))
                .andExpect(jsonPath("$.price").value(4500))
                .andExpect(jsonPath("$.categoryId").value(10))
                .andExpect(jsonPath("$.categoryName").value("커피"))
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.supportsHot").value(true))
                .andExpect(jsonPath("$.supportsIced").value(true));
    }

    @Test
    void s8UnavailableMenuIsStillReadable() throws Exception {
        when(menuRepository.findBySlugAndArchivedAtIsNull("americano")).thenReturn(Optional.of(menu(false)));

        mockMvc.perform(get("/api/v1/menus/americano"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void s9MissingOrArchivedSlugReturnsNotFound() throws Exception {
        when(menuRepository.findBySlugAndArchivedAtIsNull(anyString())).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/menus/unknown"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc.perform(get("/api/v1/menus/old-menu"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @SuppressWarnings("unchecked")
    private void listReturns(int itemCount, long total) {
        when(menuRepository.findAll(any(Specification.class), any(Pageable.class))).thenAnswer(invocation -> {
            Pageable pageable = invocation.getArgument(1);
            List<Menu> menus = IntStream.range(0, itemCount).mapToObj(i -> menu(true)).toList();
            return new PageImpl<>(menus, pageable, total);
        });
    }

    @SuppressWarnings("unchecked")
    private Pageable capturedPageable() {
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(menuRepository).findAll(any(Specification.class), captor.capture());
        return captor.getValue();
    }

    private static Menu menu(boolean available) {
        Menu menu = Menu.create(category(10L, "커피"), "americano", new MenuDetails(
                "아메리카노", "진한 커피", "/images/menus/coffee.png", 4500, available, false, true, true, true));
        ReflectionTestUtils.setField(menu, "id", 5L);
        ReflectionTestUtils.invokeMethod(menu, "onCreate");
        return menu;
    }

    private static Category category(Long id, String name) {
        Category category = Category.create(name, 1);
        ReflectionTestUtils.setField(category, "id", id);
        return category;
    }

    private static Category fallbackCategory(Long id) {
        Category category = Category.createFallback(3);
        ReflectionTestUtils.setField(category, "id", id);
        return category;
    }
}
