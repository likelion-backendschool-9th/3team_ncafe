package com.newcafe.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
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
import com.newcafe.backend.common.security.SessionMemberService;
import com.newcafe.backend.common.security.SessionUserDetails;
import com.newcafe.backend.config.PasswordConfig;
import com.newcafe.backend.config.SecurityConfig;
import com.newcafe.backend.controller.my.UsersController;
import com.newcafe.backend.dto.auth.MemberResponse;
import com.newcafe.backend.dto.auth.SignupRequest;
import com.newcafe.backend.dto.auth.SignupResponse;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.repository.UserRepository;
import com.newcafe.backend.service.AuthService;
import com.newcafe.backend.service.my.UsersService;

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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest({AuthController.class, UsersController.class, ApiAccessPolicyTest.ProbeController.class})
@Import({SecurityConfig.class, PasswordConfig.class, Passwords.class, DatabaseUserDetailsService.class,
        LoginSuccessHandler.class, SecurityErrorHandler.class, SessionMemberService.class,
        SessionCookieLogoutHandler.class, ApiLogoutSuccessHandler.class, ApiAccessPolicyTest.ProbeController.class})
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
        verifyNoInteractions(authService, usersService);
    }

    static Stream<Arguments> unsupportedRequests() {
        return Stream.of(
                Arguments.of("GET", "/api/v1/auth/signup"),
                Arguments.of("GET", "/api/v1/auth/login"),
                Arguments.of("GET", "/api/v1/auth/logout"),
                Arguments.of("POST", "/api/v1/auth/csrf"),
                Arguments.of("POST", "/api/v1/my"),
                Arguments.of("PUT", "/api/v1/my"),
                Arguments.of("GET", "/api/v1/menus"),
                Arguments.of("GET", "/api/v1/guest/menus"));
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
