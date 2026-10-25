package com.newcafe.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.security.DatabaseUserDetailsService;
import com.newcafe.backend.common.security.LoginSuccessHandler;
import com.newcafe.backend.common.security.Passwords;
import com.newcafe.backend.common.security.SecurityErrorHandler;
import com.newcafe.backend.common.security.SessionUserDetails;
import com.newcafe.backend.config.PasswordConfig;
import com.newcafe.backend.config.SecurityConfig;
import com.newcafe.backend.controller.my.UsersController;
import com.newcafe.backend.dto.auth.MemberResponse;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserStatus;
import com.newcafe.backend.repository.UserRepository;
import com.newcafe.backend.service.AuthService;
import com.newcafe.backend.service.my.UsersService;

import java.io.ByteArrayOutputStream;
import java.io.ObjectOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
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
import org.springframework.security.web.WebAttributes;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import tools.jackson.databind.json.JsonMapper;

@WebMvcTest({AuthController.class, UsersController.class})
@Import({SecurityConfig.class, PasswordConfig.class, Passwords.class, DatabaseUserDetailsService.class,
        LoginSuccessHandler.class, SecurityErrorHandler.class})
class LoginSecurityTest {

    private static final String EMAIL = "member@example.com";
    private static final String PASSWORD = " secret-login123! ";
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

    @Test
    void loginErasesSessionCredentialsAndRestoresPrincipalOnNextRequest() throws Exception {
        String passwordHash = passwords.encode(PASSWORD);
        User user = member(passwordHash);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(usersService.getCurrent(42L)).thenReturn(MemberResponse.from(user));
        CsrfSession csrf = csrfSession();
        String anonymousSessionId = csrf.session().getId();

        var login = mockMvc.perform(post("/api/v1/auth/login")
                        .session(csrf.session())
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("email", " MEMBER@EXAMPLE.COM ")
                        .param("password", PASSWORD)
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.role").value("customer"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn();

        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        assertNotNull(session);
        assertNotEquals(anonymousSessionId, session.getId());
        SecurityContext stored = assertInstanceOf(SecurityContext.class, session.getAttribute(CONTEXT_KEY));
        assertNull(stored.getAuthentication().getCredentials());
        SessionUserDetails principal = assertInstanceOf(SessionUserDetails.class,
                stored.getAuthentication().getPrincipal());
        assertEquals(42L, principal.getId());
        assertNull(principal.getPassword());

        Map<String, Object> sessionState = new HashMap<>();
        Collections.list(session.getAttributeNames()).forEach(name -> sessionState.put(name, session.getAttribute(name)));
        ByteArrayOutputStream serialized = new ByteArrayOutputStream();
        try (ObjectOutputStream output = new ObjectOutputStream(serialized)) {
            output.writeObject(sessionState);
        }
        String sessionBytes = serialized.toString(StandardCharsets.ISO_8859_1);
        assertFalse(sessionBytes.contains(PASSWORD));
        assertFalse(sessionBytes.contains(passwordHash));
        assertFalse(login.getResponse().getContentAsString().contains(PASSWORD));
        assertFalse(login.getResponse().getContentAsString().contains(passwordHash));

        mockMvc.perform(get("/api/v1/my").session(session))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.email").value(EMAIL));
        verify(usersService).getCurrent(42L);
    }

    @ParameterizedTest
    @ValueSource(strings = {"missing-member", "wrong-password", "suspended"})
    void failedLoginReturnsSameJsonWithoutSavingAuthenticationOrException(String failure) throws Exception {
        User user = member(passwords.encode(PASSWORD));
        if (failure.equals("suspended")) {
            ReflectionTestUtils.setField(user, "status", UserStatus.SUSPENDED);
        }
        when(userRepository.findByEmail(EMAIL))
                .thenReturn(failure.equals("missing-member") ? Optional.empty() : Optional.of(user));
        CsrfSession csrf = csrfSession();

        mockMvc.perform(post("/api/v1/auth/login")
                        .session(csrf.session())
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("email", EMAIL)
                        .param("password", failure.equals("wrong-password") ? "wrong-password123!" : PASSWORD)
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.code").value("LOGIN_FAILED"))
                .andExpect(jsonPath("$.message").value("이메일 또는 비밀번호를 확인해 주세요."));

        assertNull(csrf.session().getAttribute(CONTEXT_KEY));
        assertNull(csrf.session().getAttribute(WebAttributes.AUTHENTICATION_EXCEPTION));
        verifyNoInteractions(usersService, authService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/login", "/api/v1/auth/login", "/api/v1/my"})
    void htmlClientsReceiveJsonUnauthorizedWithoutGeneratedLoginPage(String path) throws Exception {
        mockMvc.perform(get(path).accept(MediaType.TEXT_HTML))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().doesNotExist("Location"))
                .andExpect(header().doesNotExist("WWW-Authenticate"))
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        verifyNoInteractions(userRepository, usersService, authService);
    }

    @Test
    void basicAuthenticationRemainsDisabled() throws Exception {
        mockMvc.perform(get("/api/v1/my").with(httpBasic(EMAIL, PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().doesNotExist("WWW-Authenticate"))
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        verifyNoInteractions(userRepository, usersService, authService);
    }

    @Test
    void missingLoginCsrfIsRejectedBeforeAuthentication() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("email", EMAIL)
                        .param("password", PASSWORD))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));

        verifyNoInteractions(userRepository, usersService, authService);
    }

    private CsrfSession csrfSession() throws Exception {
        var result = mockMvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isOk()).andReturn();
        var csrf = jsonMapper.readTree(result.getResponse().getContentAsString());
        return new CsrfSession((MockHttpSession) result.getRequest().getSession(false),
                csrf.get("headerName").asText(), csrf.get("token").asText());
    }

    private static User member(String hash) {
        User user = User.createCustomer("단골 고객", EMAIL, hash);
        ReflectionTestUtils.setField(user, "id", 42L);
        return user;
    }

    private record CsrfSession(MockHttpSession session, String headerName, String token) {
    }
}
