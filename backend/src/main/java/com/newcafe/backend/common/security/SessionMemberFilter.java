package com.newcafe.backend.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.filter.OncePerRequestFilter;

public class SessionMemberFilter extends OncePerRequestFilter {

    private final SessionMemberService members;
    private final SecurityErrorHandler errors;
    private final SessionCookieLogoutHandler cookies;
    private final SecurityContextRepository contextRepository;
    private final SecurityContextLogoutHandler logout = new SecurityContextLogoutHandler();
    private final SecurityContextHolderStrategy contextHolder = SecurityContextHolder.getContextHolderStrategy();

    public SessionMemberFilter(SessionMemberService members, SecurityErrorHandler errors,
            SessionCookieLogoutHandler cookies, SecurityContextRepository contextRepository) {
        this.members = members;
        this.errors = errors;
        this.cookies = cookies;
        this.contextRepository = contextRepository;
        logout.setSecurityContextRepository(contextRepository);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication previous = contextHolder.getContext().getAuthentication();
        if (previous == null || !previous.isAuthenticated() || previous instanceof AnonymousAuthenticationToken) {
            chain.doFilter(request, response);
            return;
        }

        SessionUserDetails current = previous.getPrincipal() instanceof SessionUserDetails member
                ? members.findById(member.getId()).orElse(null) : null;
        if (current == null) {
            invalidate(request, response, previous);
            errors.commence(request, response, new InsufficientAuthenticationException("회원을 확인할 수 없습니다."));
            return;
        }
        if (!current.isEnabled()) {
            invalidate(request, response, previous);
            errors.handle(request, response, new AccessDeniedException("접근 권한이 없습니다."));
            return;
        }

        var refreshed = UsernamePasswordAuthenticationToken.authenticated(current, null, current.getAuthorities());
        refreshed.setDetails(previous.getDetails());
        SecurityContext context = contextHolder.createEmptyContext();
        context.setAuthentication(refreshed);
        contextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
        chain.doFilter(request, response);
    }

    private void invalidate(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        logout.logout(request, response, authentication);
        cookies.logout(request, response, authentication);
    }
}
