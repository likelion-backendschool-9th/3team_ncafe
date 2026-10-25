package com.newcafe.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import com.newcafe.backend.controller.admin.CategoriesController;
import com.newcafe.backend.controller.my.UsersController;
import com.newcafe.backend.dto.auth.MemberResponse;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;
import com.newcafe.backend.repository.UserRepository;
import com.newcafe.backend.service.AuthService;
import com.newcafe.backend.service.admin.CategoriesService;
import com.newcafe.backend.service.my.UsersService;

import jakarta.servlet.http.Cookie;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import tools.jackson.databind.json.JsonMapper;

@WebMvcTest({AuthController.class, UsersController.class, CategoriesController.class})
@Import({SecurityConfig.class, PasswordConfig.class, Passwords.class, DatabaseUserDetailsService.class,
        LoginSuccessHandler.class, SecurityErrorHandler.class, SessionMemberService.class,
        SessionCookieLogoutHandler.class, ApiLogoutSuccessHandler.class})
class SessionSecurityTest {

    private static final String EMAIL = "session@example.com";
    private static final String PASSWORD = "session-password123!";
    private static final String CONTEXT_KEY = HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private Passwords passwords;

    @Autowired
    private JsonMapper jsonMapper;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private UsersService usersService;

    @MockitoBean
    private CategoriesService categoriesService;

    @Test
    void currentDatabaseRoleControlsAdminAuthorizationBeforeControllerRuns() throws Exception {
        MemberSession member = login();
        when(categoriesService.list()).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/admin/categories").session(member.session()))
                .andExpect(status().isForbidden());
        verifyNoInteractions(categoriesService);

        ReflectionTestUtils.setField(member.user(), "role", UserRole.ADMIN);
        mockMvc.perform(get("/api/v1/admin/categories").session(member.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        assertSessionPrincipal(member.session(), UserRole.ADMIN);

        ReflectionTestUtils.setField(member.user(), "role", UserRole.CUSTOMER);
        mockMvc.perform(get("/api/v1/admin/categories").session(member.session()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        assertSessionPrincipal(member.session(), UserRole.CUSTOMER);
        verify(categoriesService).list();
    }

    @Test
    void suspendedMemberIsForbiddenAndExistingSessionIsDestroyed() throws Exception {
        MemberSession member = login();
        ReflectionTestUtils.setField(member.user(), "status", UserStatus.SUSPENDED);

        mockMvc.perform(get("/api/v1/my").session(member.session()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        assertTrue(member.session().isInvalid());
        mockMvc.perform(get("/api/v1/my").session(member.session()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        verifyNoInteractions(usersService);
    }

    @Test
    void deletedMemberIsUnauthorizedAndExistingSessionIsDestroyed() throws Exception {
        MemberSession member = login();
        when(userRepository.findById(42L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/my").session(member.session()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        assertTrue(member.session().isInvalid());
        verifyNoInteractions(usersService);
    }

    @Test
    void authenticatedUnknownPrincipalFailsClosedWithoutCallingMemberServices() throws Exception {
        MockHttpSession session = new MockHttpSession();

        mockMvc.perform(get("/api/v1/my").session(session).with(user("unexpected").roles("ADMIN")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        assertTrue(session.isInvalid());
        verifyNoInteractions(userRepository, usersService, categoriesService, authService);
    }

    @Test
    void standardLogoutDestroysSessionAndStoredSecurityAndCsrfState() throws Exception {
        MemberSession member = login();
        CsrfSession csrf = csrf(member.session());
        SecurityContext stored = assertInstanceOf(SecurityContext.class, member.session().getAttribute(CONTEXT_KEY));

        var result = mockMvc.perform(post("/api/v1/auth/logout").session(member.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andReturn();

        assertTrue(member.session().isInvalid());
        assertNull(stored.getAuthentication());
        assertNull(result.getRequest().getSession(false));
        mockMvc.perform(get("/api/v1/my").session(member.session()))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(usersService);
    }

    @Test
    void suspendedMemberCanStillLogoutWithValidCsrfBeforeStatusFilterRuns() throws Exception {
        MemberSession member = login();
        CsrfSession csrf = csrf(member.session());
        ReflectionTestUtils.setField(member.user(), "status", UserStatus.SUSPENDED);

        mockMvc.perform(post("/api/v1/auth/logout").session(member.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isNoContent());

        assertTrue(member.session().isInvalid());
        verifyNoInteractions(usersService);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void missingOrInvalidLogoutCsrfKeepsAuthenticatedSession(boolean invalidToken) throws Exception {
        MemberSession member = login();
        CsrfSession csrf = csrf(member.session());
        MockHttpServletRequestBuilder logout = post("/api/v1/auth/logout").session(member.session());
        if (invalidToken) {
            logout.header(csrf.headerName(), "invalid-token");
        }

        mockMvc.perform(logout)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));

        assertFalse(member.session().isInvalid());
        mockMvc.perform(get("/api/v1/my").session(member.session()))
                .andExpect(status().isOk());
        assertSessionPrincipal(member.session(), UserRole.CUSTOMER);
    }

    @Test
    void getLogoutDoesNotInvalidateAuthenticatedSession() throws Exception {
        MemberSession member = login();

        mockMvc.perform(get("/api/v1/auth/logout").session(member.session()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        assertFalse(member.session().isInvalid());
        mockMvc.perform(get("/api/v1/my").session(member.session()))
                .andExpect(status().isOk());
    }

    @Test
    void sessionInvalidatedDuringMemberLookupIsNeverRecreatedWithAuthentication() throws Exception {
        MemberSession member = login();
        String previousSessionId = member.session().getId();
        when(userRepository.findById(42L)).thenAnswer(invocation -> {
            member.session().invalidate();
            return Optional.of(member.user());
        });

        var result = mockMvc.perform(get("/api/v1/my").session(member.session()))
                .andExpect(status().isOk()).andReturn();

        assertTrue(member.session().isInvalid());
        assertNull(result.getRequest().getSession(false));
        mockMvc.perform(get("/api/v1/my").session(member.session())
                        .cookie(new Cookie("JSESSIONID", previousSessionId)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    private MemberSession login() throws Exception {
        User member = User.createCustomer("세션 회원", EMAIL, passwords.encode(PASSWORD));
        ReflectionTestUtils.setField(member, "id", 42L);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(member));
        when(userRepository.findById(42L)).thenReturn(Optional.of(member));
        when(usersService.getCurrent(42L)).thenAnswer(invocation -> MemberResponse.from(member));
        CsrfSession csrf = csrf(null);

        var result = mockMvc.perform(post("/api/v1/auth/login").session(csrf.session())
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("email", EMAIL).param("password", PASSWORD)
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isOk()).andReturn();
        return new MemberSession(member, (MockHttpSession) result.getRequest().getSession(false));
    }

    private CsrfSession csrf(MockHttpSession session) throws Exception {
        MockHttpServletRequestBuilder request = get("/api/v1/auth/csrf");
        if (session != null) {
            request.session(session);
        }
        var result = mockMvc.perform(request).andExpect(status().isOk()).andReturn();
        var token = jsonMapper.readTree(result.getResponse().getContentAsString());
        return new CsrfSession((MockHttpSession) result.getRequest().getSession(false),
                token.get("headerName").asText(), token.get("token").asText());
    }

    private static void assertSessionPrincipal(MockHttpSession session, UserRole role) {
        SecurityContext context = assertInstanceOf(SecurityContext.class, session.getAttribute(CONTEXT_KEY));
        assertNull(context.getAuthentication().getCredentials());
        SessionUserDetails principal = assertInstanceOf(SessionUserDetails.class,
                context.getAuthentication().getPrincipal());
        assertNull(principal.getPassword());
        assertEquals(role, principal.getRole());
    }

    private record MemberSession(User user, MockHttpSession session) {
    }

    private record CsrfSession(MockHttpSession session, String headerName, String token) {
    }
}
