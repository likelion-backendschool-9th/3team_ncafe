package com.newcafe.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.security.ApiLogoutSuccessHandler;
import com.newcafe.backend.common.security.DatabaseUserDetailsService;
import com.newcafe.backend.common.security.LoginSuccessHandler;
import com.newcafe.backend.common.security.Passwords;
import com.newcafe.backend.common.security.SecurityErrorHandler;
import com.newcafe.backend.common.security.SessionCookieLogoutHandler;
import com.newcafe.backend.common.security.SessionCurrentUserContext;
import com.newcafe.backend.common.security.SessionMemberService;
import com.newcafe.backend.common.security.SessionUserDetails;
import com.newcafe.backend.config.PasswordConfig;
import com.newcafe.backend.config.SecurityConfig;
import com.newcafe.backend.controller.my.CartItemsController;
import com.newcafe.backend.controller.my.OrdersController;
import com.newcafe.backend.controller.my.UsersController;
import com.newcafe.backend.dto.auth.MemberResponse;
import com.newcafe.backend.dto.auth.SignupRequest;
import com.newcafe.backend.dto.auth.SignupResponse;
import com.newcafe.backend.dto.cartitems.CartItemQuantityRequest;
import com.newcafe.backend.dto.cartitems.CartItemRequest;
import com.newcafe.backend.dto.cartitems.CartItemResponse;
import com.newcafe.backend.dto.cartitems.CartItemsResponse;
import com.newcafe.backend.dto.menus.MenuCategoryResponse;
import com.newcafe.backend.dto.menus.MenuPageResponse;
import com.newcafe.backend.dto.menus.MenuResponse;
import com.newcafe.backend.dto.menus.MenuSearchRequest;
import com.newcafe.backend.dto.songs.IndexSongsResponse;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.repository.UserRepository;
import com.newcafe.backend.service.AuthService;
import com.newcafe.backend.service.HomeService;
import com.newcafe.backend.service.MenusService;
import com.newcafe.backend.service.my.CartItemsService;
import com.newcafe.backend.service.my.OrdersService;
import com.newcafe.backend.service.my.UsersService;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest({AuthController.class, UsersController.class, MenusController.class, HomeController.class,
        CartItemsController.class, OrdersController.class,
        ApiAccessPolicyTest.ProbeController.class})
@Import({SecurityConfig.class, PasswordConfig.class, Passwords.class, DatabaseUserDetailsService.class,
        LoginSuccessHandler.class, SecurityErrorHandler.class, SessionMemberService.class,
        SessionCookieLogoutHandler.class, ApiLogoutSuccessHandler.class, SessionCurrentUserContext.class,
        ApiAccessPolicyTest.ProbeController.class})
class ApiAccessPolicyTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProbeController probe;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private UsersService usersService;

    @MockitoBean
    private MenusService menusService;

    @MockitoBean
    private HomeService homeService;

    @MockitoBean
    private CartItemsService cartItemsService;

    @MockitoBean
    private OrdersService ordersService;

    @BeforeEach
    void resetProbe() {
        probe.calls.set(0);
    }

    @Test
    void csrfAndSignupRemainPublicButSignupStillRequiresCsrf() throws Exception {
        mockMvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
        mockMvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
        verifyNoInteractions(authService);

        User member = member(UserRole.CUSTOMER);
        when(authService.signup(any(SignupRequest.class))).thenReturn(SignupResponse.from(member));
        mockMvc.perform(post("/api/v1/auth/signup").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"회원 이름","email":"member@example.com",
                                 "password":"password123!","passwordConfirm":"password123!"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("customer"));
        verify(authService).signup(any(SignupRequest.class));
    }

    @Test
    void onlyAuthenticatedMembersCanReadMy() throws Exception {
        mockMvc.perform(get("/api/v1/my"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        verifyNoInteractions(usersService);

        User member = member(UserRole.CUSTOMER);
        when(usersService.getCurrent(42L)).thenReturn(MemberResponse.from(member));
        mockMvc.perform(get("/api/v1/my").with(user(principal(UserRole.CUSTOMER))))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.id").value(42));
        verify(usersService).getCurrent(42L);
    }

    @Test
    void anonymousVisitorsCanReadPublicMenusAndHomeRecommendations() throws Exception {
        MenuResponse menu = new MenuResponse(5L, "americano", "아메리카노", "진한 커피",
                "/images/menus/coffee.png", 4500, 10L, "커피", true, false, true, true, true, null, null);
        when(menusService.list(any(MenuSearchRequest.class)))
                .thenReturn(new MenuPageResponse(List.of(menu), 0, 20, 1, 1));
        when(menusService.categories()).thenReturn(List.of(new MenuCategoryResponse(10L, "커피")));
        when(menusService.get("americano")).thenReturn(menu);
        when(homeService.recommendedMenus()).thenReturn(List.of(menu));

        mockMvc.perform(get("/api/v1/menus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].slug").value("americano"));
        mockMvc.perform(get("/api/v1/menus/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10));
        mockMvc.perform(get("/api/v1/menus/americano"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("americano"));
        mockMvc.perform(get("/api/v1/index/menus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].slug").value("americano"));

        verify(menusService).list(any(MenuSearchRequest.class));
        verify(menusService).categories();
        verify(menusService).get("americano");
        verify(homeService).recommendedMenus();
    }

    @Test
    void anonymousVisitorsCanReadHomeSongs() throws Exception {
        when(homeService.songs()).thenReturn(new IndexSongsResponse(null, List.of(), 0, Instant.parse("2026-10-27T03:01:00Z"), 5L));

        mockMvc.perform(get("/api/v1/index/songs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revision").value(5));
        verify(homeService).songs();
    }

    @ParameterizedTest
    @MethodSource("unsupportedRequests")
    void incorrectMethodsAndUndeclaredRoutesAreDeniedBeforeControllers(String method, String path) throws Exception {
        mockMvc.perform(request(HttpMethod.valueOf(method), path).with(csrf()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        mockMvc.perform(request(HttpMethod.valueOf(method), path).with(csrf())
                        .with(user(principal(UserRole.CUSTOMER))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        verifyNoInteractions(authService, usersService, menusService, homeService);
    }

    static Stream<Arguments> unsupportedRequests() {
        return Stream.of(
                Arguments.of("GET", "/api/v1/auth/signup"),
                Arguments.of("GET", "/api/v1/auth/login"),
                Arguments.of("GET", "/api/v1/auth/logout"),
                Arguments.of("POST", "/api/v1/auth/csrf"),
                Arguments.of("POST", "/api/v1/my"),
                Arguments.of("PUT", "/api/v1/my"),
                Arguments.of("POST", "/api/v1/menus"),
                Arguments.of("POST", "/api/v1/menus/categories"),
                Arguments.of("POST", "/api/v1/menus/americano"),
                Arguments.of("POST", "/api/v1/index/menus"),
                Arguments.of("POST", "/api/v1/index/songs"),
                Arguments.of("GET", "/api/v1/guest/menus"),
                Arguments.of("PATCH", "/api/v1/cart/items/11"),
                Arguments.of("POST", "/api/v1/cart/items"),
                Arguments.of("PUT", "/api/v1/orders/7"),
                Arguments.of("DELETE", "/api/v1/orders/7"));
    }

    static Stream<Arguments> cartRequests() {
        return Stream.of(
                Arguments.of("POST", "/api/v1/menus/1/cart/items", "{\"temperature\":\"iced\",\"quantity\":1}"),
                Arguments.of("GET", "/api/v1/cart/items", null),
                Arguments.of("PUT", "/api/v1/cart/items/11", "{\"quantity\":2}"),
                Arguments.of("DELETE", "/api/v1/cart/items/11", null));
    }

    @ParameterizedTest
    @MethodSource("cartRequests")
    void cartRoutesAreForSignedInCustomersOnly(String method, String path, String body) throws Exception {
        mockMvc.perform(cartRequest(method, path, body).with(csrf()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        mockMvc.perform(cartRequest(method, path, body).with(csrf()).with(user(principal(UserRole.ADMIN))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        verifyNoInteractions(cartItemsService);

        when(cartItemsService.add(eq(42L), eq(1L), any(CartItemRequest.class)))
                .thenReturn(new CartItemsService.Added(cartLine(), true));
        when(cartItemsService.list(42L)).thenReturn(new CartItemsResponse(List.of(cartLine()), 1, 3500));
        when(cartItemsService.changeQuantity(eq(42L), eq(11L), any(CartItemQuantityRequest.class))).thenReturn(cartLine());
        mockMvc.perform(cartRequest(method, path, body).with(csrf()).with(user(principal(UserRole.CUSTOMER))))
                .andExpect(status().is2xxSuccessful());
    }

    @ParameterizedTest
    @MethodSource("cartRequests")
    void cartChangesRequireCsrf(String method, String path, String body) throws Exception {
        var result = mockMvc.perform(cartRequest(method, path, body).with(user(principal(UserRole.CUSTOMER))));
        if ("GET".equals(method)) {
            result.andExpect(status().isOk());
            return;
        }
        result.andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
        verifyNoInteractions(cartItemsService);
    }

    private static MockHttpServletRequestBuilder cartRequest(String method, String path, String body) {
        MockHttpServletRequestBuilder builder = request(HttpMethod.valueOf(method), path);
        return body == null ? builder : builder.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private static CartItemResponse cartLine() {
        return new CartItemResponse(11L, 1L, "coffee", "커피", "/images/menus/coffee.jpg", 3500, "iced", 1, 3500, true);
    }

    static Stream<Arguments> orderRequests() {
        return Stream.of(
                Arguments.of("POST", "/api/v1/orders", """
                        {"cartItemIds":[11],"orderType":"takeout","paymentMethod":"card",
                         "request":"","expectedTotalAmount":3500}
                        """),
                Arguments.of("GET", "/api/v1/orders", null),
                Arguments.of("GET", "/api/v1/orders/7", null));
    }

    @ParameterizedTest
    @MethodSource("orderRequests")
    void orderRoutesAreForSignedInCustomersOnly(String method, String path, String body) throws Exception {
        mockMvc.perform(orderRequest(method, path, body).with(csrf()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        mockMvc.perform(orderRequest(method, path, body).with(csrf()).with(user(principal(UserRole.ADMIN))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        verifyNoInteractions(ordersService);

        // 여기서는 고객 요청이 Controller까지 닿는지만 확인한다. 주문 생성·조회 규칙은 OrdersService 테스트가 본다.
        mockMvc.perform(orderRequest(method, path, body).with(csrf()).with(user(principal(UserRole.CUSTOMER))))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    void orderCreationRequiresCsrf() throws Exception {
        var body = orderRequests().findFirst().orElseThrow().get()[2].toString();
        mockMvc.perform(orderRequest("POST", "/api/v1/orders", body).with(user(principal(UserRole.CUSTOMER))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
        verifyNoInteractions(ordersService);
    }

    private static MockHttpServletRequestBuilder orderRequest(String method, String path, String body) {
        MockHttpServletRequestBuilder builder = request(HttpMethod.valueOf(method), path);
        return body == null ? builder : builder.header("Idempotency-Key", "order-key-1")
                .contentType(MediaType.APPLICATION_JSON).content(body);
    }

    @ParameterizedTest
    @ValueSource(strings = {"GET", "POST"})
    void newlyAddedControllerNeedsAnExplicitAccessRuleEvenForAdministrators(String method) throws Exception {
        String path = "/api/v1/access-policy-probe";
        mockMvc.perform(request(HttpMethod.valueOf(method), path).with(csrf()))
                .andExpect(status().isUnauthorized());
        for (UserRole role : UserRole.values()) {
            mockMvc.perform(request(HttpMethod.valueOf(method), path).with(csrf()).with(user(principal(role))))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                    .andExpect(header().doesNotExist("Location"));
        }
        assertEquals(0, probe.calls.get());
    }

    private SessionUserDetails principal(UserRole role) {
        User member = member(role);
        when(userRepository.findById(42L)).thenReturn(Optional.of(member));
        return SessionUserDetails.forSession(member);
    }

    private static User member(UserRole role) {
        User member = User.createCustomer("회원 이름", "member@example.com", "{bcrypt}$2a$10$" + "a".repeat(53));
        ReflectionTestUtils.setField(member, "id", 42L);
        ReflectionTestUtils.setField(member, "role", role);
        return member;
    }

    @RestController
    static class ProbeController {
        private final AtomicInteger calls = new AtomicInteger();

        @RequestMapping(path = "/api/v1/access-policy-probe", method = {RequestMethod.GET, RequestMethod.POST})
        ResponseEntity<Void> invoke() {
            calls.incrementAndGet();
            return ResponseEntity.noContent().build();
        }
    }
}
