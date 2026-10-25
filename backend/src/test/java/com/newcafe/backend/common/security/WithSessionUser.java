package com.newcafe.backend.common.security;

import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithSecurityContext;
import org.springframework.security.test.context.support.WithSecurityContextFactory;
import org.springframework.test.util.ReflectionTestUtils;

@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
@WithSecurityContext(factory = WithSessionUser.Factory.class)
public @interface WithSessionUser {

    UserRole role() default UserRole.CUSTOMER;

    final class Factory implements WithSecurityContextFactory<WithSessionUser> {

        @Override
        public SecurityContext createSecurityContext(WithSessionUser annotation) {
            User user = User.createCustomer("테스트 회원", "member@example.com", "{bcrypt}$2a$10$" + "a".repeat(53));
            ReflectionTestUtils.setField(user, "id", 42L);
            ReflectionTestUtils.setField(user, "role", annotation.role());
            SessionUserDetails principal = SessionUserDetails.forSession(user);
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                    principal, null, principal.getAuthorities()));
            return context;
        }
    }
}
