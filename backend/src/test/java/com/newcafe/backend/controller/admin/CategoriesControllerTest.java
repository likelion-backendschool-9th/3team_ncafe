package com.newcafe.backend.controller.admin;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.error.CategoryErrorHandler;
import com.newcafe.backend.entity.Category;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.service.admin.CategoriesService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.test.util.ReflectionTestUtils;

class CategoriesControllerTest {

    private CategoryRepository categoryRepository;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        categoryRepository = org.mockito.Mockito.mock(CategoryRepository.class);
        MenuRepository menuRepository = org.mockito.Mockito.mock(MenuRepository.class);
        CategoriesService categoriesService = new CategoriesService(categoryRepository, menuRepository);
        mockMvc = MockMvcBuilders.standaloneSetup(new CategoriesController(categoriesService))
                .setControllerAdvice(new CategoryErrorHandler())
                .build();
    }

    @Test
    void createTrimsNameAndReturnsCreatedLocation() throws Exception {
        Category fallback = Category.createFallback(1);
        ReflectionTestUtils.setField(fallback, "id", 1L);
        when(categoryRepository.findFallbackForUpdate()).thenReturn(Optional.of(fallback));
        when(categoryRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(fallback));
        when(categoryRepository.saveAndFlush(any(Category.class))).thenAnswer(invocation -> {
            Category category = invocation.getArgument(0);
            ReflectionTestUtils.setField(category, "id", 10L);
            return category;
        });

        mockMvc.perform(post("/api/v1/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" 커피 \"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/v1/admin/categories/10"))
                .andExpect(jsonPath("$.name").value("커피"));

        org.mockito.Mockito.verify(categoryRepository).existsByName("커피");
    }

    @Test
    void blankNameReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/v1/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void deletingMissingCategoryReturnsNotFound() throws Exception {
        Category fallback = Category.createFallback(1);
        ReflectionTestUtils.setField(fallback, "id", 1L);
        when(categoryRepository.findFallbackForUpdate()).thenReturn(Optional.of(fallback));

        mockMvc.perform(delete("/api/v1/admin/categories/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void invalidCategoryIdReturnsCommonErrorResponse() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/categories/not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }
}
