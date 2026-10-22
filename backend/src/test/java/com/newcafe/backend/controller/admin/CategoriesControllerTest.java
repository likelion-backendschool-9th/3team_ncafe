package com.newcafe.backend.controller.admin;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.error.ApiExceptionHandler;
import com.newcafe.backend.common.security.SecurityErrorHandler;
import com.newcafe.backend.config.SecurityConfig;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.service.admin.CategoriesService;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CategoriesController.class)
@Import({SecurityConfig.class, SecurityErrorHandler.class, ApiExceptionHandler.class, CategoriesService.class})
@WithMockUser(roles = "ADMIN")
class CategoriesControllerTest {

    @MockitoBean
    private CategoryRepository categoryRepository;

    @MockitoBean
    private MenuRepository menuRepository;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    @WithAnonymousUser
    void anonymousAdminReadReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/admin/categories"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        verifyNoInteractions(categoryRepository, menuRepository);
    }

    @Test
    @WithAnonymousUser
    void generatedAccountAndHttpBasicRemainDisabled() throws Exception {
        assertTrue(applicationContext.getBeansOfType(UserDetailsService.class).isEmpty());

        mockMvc.perform(get("/api/v1/admin/categories").with(httpBasic("user", "password")))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().doesNotExist("WWW-Authenticate"))
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        verifyNoInteractions(categoryRepository, menuRepository);
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void customerCannotReadAdminData() throws Exception {
        mockMvc.perform(get("/api/v1/admin/categories"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        verifyNoInteractions(categoryRepository, menuRepository);
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void customerCannotCreateEvenWithValidCsrf() throws Exception {
        mockMvc.perform(post("/api/v1/admin/categories").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"커피\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        verifyNoInteractions(categoryRepository, menuRepository);
    }

    @Test
    void adminCannotCreateWithoutCsrf() throws Exception {
        mockMvc.perform(post("/api/v1/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"커피\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));

        verifyNoInteractions(categoryRepository, menuRepository);
    }

    @Test
    void createTrimsNameAndReturnsCreatedLocation() throws Exception {
        Category fallback = Category.createFallback(1);
        ReflectionTestUtils.setField(fallback, "id", 1L);

        when(categoryRepository.findFallbackForUpdate()).thenReturn(Optional.of(fallback));
        when(categoryRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(fallback));
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> {
            Category category = invocation.getArgument(0);
            ReflectionTestUtils.setField(category, "id", 10L);
            return category;
        });

        mockMvc.perform(post("/api/v1/admin/categories").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" 커피 \"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/v1/admin/categories/10"))
                .andExpect(jsonPath("$.name").value("커피"));

        org.mockito.Mockito.verify(categoryRepository).existsByName("커피");
    }

    @Test
    void blankNameReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/v1/admin/categories").with(csrf())
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

        mockMvc.perform(delete("/api/v1/admin/categories/999").with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void invalidCategoryIdReturnsCommonErrorResponse() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/categories/not-a-number").with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }
}
