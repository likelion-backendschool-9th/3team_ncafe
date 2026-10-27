package com.newcafe.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
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
import com.newcafe.backend.dto.songs.CreateSongRequest;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.repository.UserRepository;
import com.newcafe.backend.service.SongsService;

import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

// 신청곡 API의 접근 규칙과, 세션 회원이 현재 사용자로 전달되는지 확인한다. DB 없이 Repository·Service는 mock이다.
@WebMvcTest({SongsController.class, com.newcafe.backend.controller.my.SongsController.class})
@Import({SecurityConfig.class, PasswordConfig.class, Passwords.class, DatabaseUserDetailsService.class,
        LoginSuccessHandler.class, SecurityErrorHandler.class, SessionMemberService.class,
        SessionCookieLogoutHandler.class, ApiLogoutSuccessHandler.class, SessionCurrentUserContext.class})
class SongsAccessPolicyTest {

    private static final String CREATE_BODY = "{\"songTitle\":\"밤편지\",\"artist\":\"아이유\",\"story\":\"사연\"}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private SongsService songsService;

    @MockitoBean(name = "mySongsService")
    private com.newcafe.backend.service.my.SongsService mySongsService;

    @Test
    void anonymousVisitorsCanReadMusicBox() throws Exception {
        mockMvc.perform(get("/api/v1/musicbox/songs")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/musicbox/songs/now")).andExpect(status().isOk());

        verify(songsService).list();
        verify(songsService).now();
    }

    static Stream<Arguments> customerRequests() {
        return Stream.of(
                Arguments.of("POST", "/api/v1/musicbox/songs", CREATE_BODY),
                Arguments.of("GET", "/api/v1/my/songs", null),
                Arguments.of("DELETE", "/api/v1/my/songs/10", null));
    }

    @ParameterizedTest
    @MethodSource("customerRequests")
    void songRequestsAreForSignedInCustomersOnly(String method, String path, String body) throws Exception {
        mockMvc.perform(songRequest(method, path, body).with(csrf()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        mockMvc.perform(songRequest(method, path, body).with(csrf()).with(user(principal(UserRole.ADMIN))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        verifyNoInteractions(songsService, mySongsService);

        when(mySongsService.list(42L)).thenReturn(List.of());
        mockMvc.perform(songRequest(method, path, body).with(csrf()).with(user(principal(UserRole.CUSTOMER))))
                .andExpect(status().is2xxSuccessful());
    }

    @ParameterizedTest
    @MethodSource("customerRequests")
    void songChangesRequireCsrf(String method, String path, String body) throws Exception {
        var result = mockMvc.perform(songRequest(method, path, body).with(user(principal(UserRole.CUSTOMER))));
        if ("GET".equals(method)) {
            result.andExpect(status().isOk());
            return;
        }
        result.andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
        verifyNoInteractions(songsService, mySongsService);
    }

    @Test
    void sessionMemberBecomesRequesterAndOwner() throws Exception {
        mockMvc.perform(songRequest("POST", "/api/v1/musicbox/songs", CREATE_BODY)
                        .with(csrf()).with(user(principal(UserRole.CUSTOMER))))
                .andExpect(status().isCreated());
        mockMvc.perform(songRequest("DELETE", "/api/v1/my/songs/10", null)
                        .with(csrf()).with(user(principal(UserRole.CUSTOMER))))
                .andExpect(status().isNoContent());

        verify(songsService).create(eq(42L), eq("회원 이름"), any(CreateSongRequest.class));
        verify(mySongsService).delete(42L, 10L);
    }

    private static MockHttpServletRequestBuilder songRequest(String method, String path, String body) {
        MockHttpServletRequestBuilder builder = request(HttpMethod.valueOf(method), path);
        return body == null ? builder : builder.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private SessionUserDetails principal(UserRole role) {
        User member = User.createCustomer("회원 이름", "member@example.com", "{bcrypt}$2a$10$" + "a".repeat(53));
        ReflectionTestUtils.setField(member, "id", 42L);
        ReflectionTestUtils.setField(member, "role", role);
        when(userRepository.findById(42L)).thenReturn(Optional.of(member));
        return SessionUserDetails.forSession(member);
    }
}
