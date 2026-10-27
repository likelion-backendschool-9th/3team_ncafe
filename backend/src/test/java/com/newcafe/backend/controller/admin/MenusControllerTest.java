package com.newcafe.backend.controller.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.entity.menu.MenuDetails;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.repository.UserRepository;
import com.newcafe.backend.service.admin.MenusService;

import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(MenusController.class)
@Import({SecurityConfig.class, SecurityErrorHandler.class, LoginSuccessHandler.class, PasswordConfig.class,
        Passwords.class, DatabaseUserDetailsService.class, ApiLogoutSuccessHandler.class,
        SessionCookieLogoutHandler.class, ApiExceptionHandler.class, MenusService.class})
@WithSessionUser(role = UserRole.ADMIN)
class MenusControllerTest {

    private static final String VALID_BODY = """
            {"categoryId":10,"slug":"americano","name":" 아메리카노 ","description":"진한 커피",
             "imageUrl":"/images/menus/coffee.png","price":4500,"available":true,"isNew":false,
             "recommended":true,"supportsHot":true,"supportsIced":true}
            """;

    private static final String UPDATE_BODY = VALID_BODY
            .replace("\"categoryId\":10", "\"categoryId\":12")
            .replace("\"slug\":\"americano\",", "")
            .replace("\"price\":4500", "\"price\":5000")
            .replace("\"available\":true", "\"available\":false");

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
        mockMvc.perform(get("/api/v1/admin/menus"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        verifyNoInteractions(categoryRepository, menuRepository);
    }

    @Test
    @WithSessionUser(role = UserRole.CUSTOMER)
    void customerCannotReadAdminData() throws Exception {
        mockMvc.perform(get("/api/v1/admin/menus"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        verifyNoInteractions(categoryRepository, menuRepository);
    }

    @Test
    @WithSessionUser(role = UserRole.CUSTOMER)
    void customerCannotReadMenuSummary() throws Exception {
        mockMvc.perform(get("/api/v1/admin/menus/summary"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        verifyNoInteractions(menuRepository);
    }

    @Test
    void summaryCountsVisibleMenusByAvailability() throws Exception {
        when(menuRepository.countByArchivedAtIsNull()).thenReturn(12L);
        when(menuRepository.countByAvailableTrueAndArchivedAtIsNull()).thenReturn(9L);

        mockMvc.perform(get("/api/v1/admin/menus/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(12))
                .andExpect(jsonPath("$.availableCount").value(9))
                .andExpect(jsonPath("$.unavailableCount").value(3));
    }

    @Test
    void summaryReturnsZeroWhenNoMenus() throws Exception {
        mockMvc.perform(get("/api/v1/admin/menus/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(0))
                .andExpect(jsonPath("$.availableCount").value(0))
                .andExpect(jsonPath("$.unavailableCount").value(0));
    }

    @Test
    @WithSessionUser(role = UserRole.CUSTOMER)
    void customerCannotCreateEvenWithValidCsrf() throws Exception {
        mockMvc.perform(post("/api/v1/admin/menus").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        verifyNoInteractions(categoryRepository, menuRepository);
    }

    @Test
    void adminCannotCreateWithoutCsrf() throws Exception {
        mockMvc.perform(post("/api/v1/admin/menus")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));

        verifyNoInteractions(categoryRepository, menuRepository);
    }

    @Test
    void s1CreateTrimsNameAndReturnsCreatedLocation() throws Exception {
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category(10L, "커피")));
        savesWithId(5L);

        mockMvc.perform(post("/api/v1/admin/menus").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/v1/admin/menus/5"))
                .andExpect(jsonPath("$.name").value("아메리카노"))
                .andExpect(jsonPath("$.categoryName").value("커피"))
                .andExpect(jsonPath("$.createdAt").exists());
    }

    @Test
    void s2CreateAllowsMenuWithoutTemperatureOptions() throws Exception {
        when(categoryRepository.findById(12L)).thenReturn(Optional.of(category(12L, "다과")));
        savesWithId(6L);

        mockMvc.perform(post("/api/v1/admin/menus").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY
                                .replace("\"categoryId\":10", "\"categoryId\":12")
                                .replace("\"slug\":\"americano\"", "\"slug\":\"monaka\"")
                                .replace("\"supportsHot\":true", "\"supportsHot\":false")
                                .replace("\"supportsIced\":true", "\"supportsIced\":false")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.supportsHot").value(false))
                .andExpect(jsonPath("$.supportsIced").value(false));
    }

    static Stream<String> invalidBodies() {
        return Stream.of(
                VALID_BODY.replace("\"americano\"", "\"Ameri Cano\""),
                VALID_BODY.replace("\" 아메리카노 \"", "\"   \""),
                VALID_BODY.replace("\" 아메리카노 \"", "\"" + "가".repeat(81) + "\""),
                VALID_BODY.replace("\"진한 커피\"", "\"" + "가".repeat(501) + "\""),
                VALID_BODY.replace("\"price\":4500", "\"price\":0"),
                VALID_BODY.replace("\"/images/menus/coffee.png\"", "\"http://example.com/a.png\""),
                VALID_BODY.replace("\"available\":true,", "")
        );
    }

    @ParameterizedTest
    @MethodSource("invalidBodies")
    void s3InvalidInputReturnsValidationErrorWithoutSaving(String body) throws Exception {
        mockMvc.perform(post("/api/v1/admin/menus").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        verify(menuRepository, never()).save(any(Menu.class));
    }

    @Test
    void s4DuplicateSlugReturnsConflict() throws Exception {
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category(10L, "커피")));
        when(menuRepository.existsBySlug("americano")).thenReturn(true);

        mockMvc.perform(post("/api/v1/admin/menus").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    void s5MissingCategoryReturnsBadRequest() throws Exception {
        when(categoryRepository.findById(10L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/admin/menus").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void s12GetReturnsAllMenuFields() throws Exception {
        Menu menu = Menu.create(category(10L, "커피"), "americano", new MenuDetails(
                "아메리카노", "진한 커피", "/images/menus/coffee.png", 4500, true, true, false, true, false));
        ReflectionTestUtils.setField(menu, "id", 5L);
        ReflectionTestUtils.invokeMethod(menu, "onCreate");
        when(menuRepository.findByIdAndArchivedAtIsNull(5L)).thenReturn(Optional.of(menu));

        mockMvc.perform(get("/api/v1/admin/menus/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.slug").value("americano"))
                .andExpect(jsonPath("$.name").value("아메리카노"))
                .andExpect(jsonPath("$.description").value("진한 커피"))
                .andExpect(jsonPath("$.imageUrl").value("/images/menus/coffee.png"))
                .andExpect(jsonPath("$.price").value(4500))
                .andExpect(jsonPath("$.categoryId").value(10))
                .andExpect(jsonPath("$.categoryName").value("커피"))
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.isNew").value(true))
                .andExpect(jsonPath("$.recommended").value(false))
                .andExpect(jsonPath("$.supportsHot").value(true))
                .andExpect(jsonPath("$.supportsIced").value(false))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists());
    }

    @Test
    void s13MissingOrArchivedMenuReturnsNotFound() throws Exception {
        when(menuRepository.findByIdAndArchivedAtIsNull(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/admin/menus/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void s14UpdateChangesCategoryPriceAndAvailability() throws Exception {
        when(menuRepository.findByIdAndArchivedAtIsNull(5L)).thenReturn(Optional.of(existingMenu()));
        when(categoryRepository.findById(12L)).thenReturn(Optional.of(category(12L, "다과")));

        mockMvc.perform(put("/api/v1/admin/menus/5").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categoryName").value("다과"))
                .andExpect(jsonPath("$.price").value(5000))
                .andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void s15UpdateIgnoresSlug() throws Exception {
        when(menuRepository.findByIdAndArchivedAtIsNull(5L)).thenReturn(Optional.of(existingMenu()));
        when(categoryRepository.findById(12L)).thenReturn(Optional.of(category(12L, "다과")));

        mockMvc.perform(put("/api/v1/admin/menus/5").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE_BODY.replace("{", "{\"slug\":\"new-slug\",")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("americano"));
    }

    @Test
    void s16InvalidUpdateKeepsStoredValues() throws Exception {
        Menu menu = existingMenu();
        when(menuRepository.findByIdAndArchivedAtIsNull(5L)).thenReturn(Optional.of(menu));
        when(categoryRepository.findById(12L)).thenReturn(Optional.of(category(12L, "다과")));
        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/v1/admin/menus/5").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE_BODY.replace("\"price\":5000", "\"price\":0")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(put("/api/v1/admin/menus/5").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE_BODY.replace("\"categoryId\":12", "\"categoryId\":999")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        assertEquals(4500, menu.getPrice());
        assertEquals("커피", menu.getCategory().getName());
    }

    @Test
    void s16UpdatingMissingOrArchivedMenuReturnsNotFound() throws Exception {
        when(menuRepository.findByIdAndArchivedAtIsNull(6L)).thenReturn(Optional.empty());
        when(categoryRepository.findById(12L)).thenReturn(Optional.of(category(12L, "다과")));

        mockMvc.perform(put("/api/v1/admin/menus/6").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE_BODY))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void s17DeleteArchivesMenuWithoutRemovingRow() throws Exception {
        Menu menu = existingMenu();
        when(menuRepository.findByIdAndArchivedAtIsNull(5L)).thenReturn(Optional.of(menu));

        mockMvc.perform(delete("/api/v1/admin/menus/5").with(csrf()))
                .andExpect(status().isNoContent());

        assertFalse(menu.isAvailable());
        assertNotNull(menu.getArchivedAt());
        verify(menuRepository, never()).delete(any(Menu.class));
    }

    @Test
    void s18ArchivedMenuCannotBeReadOrDeletedAgain() throws Exception {
        when(menuRepository.findByIdAndArchivedAtIsNull(5L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/admin/menus/5"))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/v1/admin/menus/5").with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void s6DefaultListReturnsFirstPageOfNewestMenus() throws Exception {
        listReturns(20, 25);

        mockMvc.perform(get("/api/v1/admin/menus"))
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
    void s7SecondPageReturnsRemainingMenus() throws Exception {
        listReturns(5, 25);

        mockMvc.perform(get("/api/v1/admin/menus").param("page", "1").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(5))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.totalElements").value(25));

        assertEquals(1, capturedPageable().getPageNumber());
    }

    @Test
    void s11QueryWithExactlyMaxLengthIsAccepted() throws Exception {
        listReturns(0, 0);

        mockMvc.perform(get("/api/v1/admin/menus").param("q", " " + "가".repeat(100) + " "))
                .andExpect(status().isOk());
    }

    @Test
    void s10PriceHighSortsByPriceDescending() throws Exception {
        listReturns(3, 3);

        mockMvc.perform(get("/api/v1/admin/menus").param("sort", "price-high"))
                .andExpect(status().isOk());

        assertEquals(Sort.by(Sort.Order.desc("price"), Sort.Order.desc("id")), capturedPageable().getSort());
    }

    static Stream<String> invalidListConditions() {
        return Stream.of("sort=cheap", "status=sold", "page=-1", "size=0", "size=101", "q=" + "가".repeat(101));
    }

    @ParameterizedTest
    @MethodSource("invalidListConditions")
    @SuppressWarnings("unchecked")
    void s11InvalidListConditionReturnsBadRequest(String condition) throws Exception {
        String[] pair = condition.split("=", 2);

        mockMvc.perform(get("/api/v1/admin/menus").param(pair[0], pair[1]))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        verify(menuRepository, never()).findAll(any(Specification.class), any(Pageable.class));
    }

    @SuppressWarnings("unchecked")
    private void listReturns(int itemCount, long total) {
        when(menuRepository.findAll(any(Specification.class), any(Pageable.class))).thenAnswer(invocation -> {
            Pageable pageable = invocation.getArgument(1);
            List<Menu> menus = IntStream.range(0, itemCount).mapToObj(i -> existingMenu()).toList();
            return new PageImpl<>(menus, pageable, total);
        });
    }

    @SuppressWarnings("unchecked")
    private Pageable capturedPageable() {
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(menuRepository).findAll(any(Specification.class), captor.capture());
        return captor.getValue();
    }

    private Menu existingMenu() {
        Menu menu = Menu.create(category(10L, "커피"), "americano", new MenuDetails(
                "아메리카노", "진한 커피", "/images/menus/coffee.png", 4500, true, false, true, true, true));
        ReflectionTestUtils.setField(menu, "id", 5L);
        ReflectionTestUtils.invokeMethod(menu, "onCreate");
        return menu;
    }

    private void savesWithId(Long id) {
        when(menuRepository.save(any(Menu.class))).thenAnswer(invocation -> {
            Menu menu = invocation.getArgument(0);
            ReflectionTestUtils.setField(menu, "id", id);
            ReflectionTestUtils.invokeMethod(menu, "onCreate");
            return menu;
        });
    }

    private static Category category(Long id, String name) {
        Category category = Category.create(name, 1);
        ReflectionTestUtils.setField(category, "id", id);
        return category;
    }
}
