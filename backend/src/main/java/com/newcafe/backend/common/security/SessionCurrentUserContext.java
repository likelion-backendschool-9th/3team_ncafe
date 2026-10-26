package com.newcafe.backend.common.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

// 세션 로그인 회원을 현재 사용자로 돌려준다. 비로그인(익명 인증 포함)이면 401로 이어지는 예외를 던진다.
@Component
public class SessionCurrentUserContext implements CurrentUserContext {

    @Override
    public AuthenticatedUser requireCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof SessionUserDetails member)) {
            throw new AuthenticationRequiredException();
        }

        return new AuthenticatedUser(member.getId(), member.getName());
    }
}
