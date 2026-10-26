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
import com.newcafe.backend.common.security.ApiLogoutSuccessHandler;
import com.newcafe.backend.common.security.SessionCookieLogoutHandler;
import com.newcafe.backend.common.security.SessionMemberService;
import com.newcafe.backend.common.security.SessionUserDetails;
import com.newcafe.backend.common.security.WithSessionUser;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.common.security.DatabaseUserDetailsService;
import com.newcafe.backend.common.security.LoginSuccessHandler;
import com.newcafe.backend.common.security.Passwords;
import com.newcafe.backend.config.PasswordConfig;
import com.newcafe.backend.config.SecurityConfig;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.repository.UserRepository;
import com.newcafe.backend.service.admin.CategoriesService;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CategoriesController.class)
@Import({SecurityConfig.class, SecurityErrorHandler.class, LoginSuccessHandler.class, PasswordConfig.class,
        Passwords.class, DatabaseUserDetailsService.class, ApiLogoutSuccessHandler.class,
        SessionCookieLogoutHandler.class, ApiExceptionHandler.class, CategoriesService.class})
@WithSessionUser(role = UserRole.ADMIN)
class CategoriesControllerTest {

    @MockitoBean
    private SessionMemberService sessionMembers;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private CategoryRepository categoryRepository;

    @MockitoBean
    private MenuRepository menuRepository;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationContext applicationContext;

    @BeforeEach
    void currentSessionMember() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof SessionUserDetails member) {
            when(sessionMembers.findById(member.getId())).thenReturn(Optional.of(member));
        }
    }

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
        assertTrue(applicationContext.getBeansOfType(UserDetailsService.class).values().stream()
                .allMatch(DatabaseUserDetailsService.class::isInstance));
        assertTrue(applicationContext.getBeansOfType(UserDetailsService.class).size() == 1);

        mockMvc.perform(get("/api/v1/admin/categories").with(httpBasic("user", "password")))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().doesNotExist("WWW-Authenticate"))
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        verifyNoInteractions(categoryRepository, menuRepository);
    }

    @Test
    @WithSessionUser(role = UserRole.CUSTOMER)
    void customerCannotReadAdminData() throws Exception {
        mockMvc.perform(get("/api/v1/admin/categories"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        verifyNoInteractions(categoryRepository, menuRepository);
    }

    @Test
    @WithSessionUser(role = UserRole.CUSTOMER)
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
