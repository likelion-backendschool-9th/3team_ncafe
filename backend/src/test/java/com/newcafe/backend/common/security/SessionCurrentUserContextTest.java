package com.newcafe.backend.common.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.newcafe.backend.entity.user.User;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

class SessionCurrentUserContextTest {

    private final SessionCurrentUserContext context = new SessionCurrentUserContext();

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void returnsSessionMember() {
        User user = User.createCustomer("민지", "minji@example.com", "{bcrypt}$2a$10$" + "a".repeat(53));
        ReflectionTestUtils.setField(user, "id", 7L);
        SessionUserDetails member = SessionUserDetails.forSession(user);
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(member, null, member.getAuthorities()));

        assertEquals(new AuthenticatedUser(7L, "민지"), context.requireCurrentUser());
    }

    @Test
    void rejectsMissingAuthentication() {
        assertThrows(AuthenticationRequiredException.class, context::requireCurrentUser);
    }

    @Test
    void rejectsAnonymousAuthentication() {
        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken(
                "key", "anonymousUser", List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));

        assertThrows(AuthenticationRequiredException.class, context::requireCurrentUser);
    }
}
