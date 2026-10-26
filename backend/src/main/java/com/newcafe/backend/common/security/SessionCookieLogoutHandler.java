package com.newcafe.backend.common.security;

import jakarta.servlet.SessionCookieConfig;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.time.Duration;

import org.springframework.boot.web.server.Cookie;
import org.springframework.boot.web.server.autoconfigure.ServerProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class SessionCookieLogoutHandler implements LogoutHandler {

    private final ServerProperties serverProperties;

    public SessionCookieLogoutHandler(ServerProperties serverProperties) {
        this.serverProperties = serverProperties;
    }

    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        Cookie cookie = serverProperties.getServlet().getSession().getCookie();
        SessionCookieConfig actual = request.getServletContext().getSessionCookieConfig();
        String name = firstNonEmpty(actual.getName(), cookie.getName(), "JSESSIONID");
        String path = firstNonEmpty(actual.getPath(), cookie.getPath(), request.getContextPath(),
                serverProperties.getServlet().getContextPath(), "/");
        String domain = firstNonEmpty(actual.getDomain(), cookie.getDomain());
        String sameSite = cookie.getSameSite() == null
                ? actual.getAttribute("SameSite") : cookie.getSameSite().attributeValue();

        ResponseCookie expired = ResponseCookie.from(name, "")
                .path(path)
                .domain(domain)
                .httpOnly(actual.isHttpOnly() || !Boolean.FALSE.equals(cookie.getHttpOnly()))
                .secure(actual.isSecure() || Boolean.TRUE.equals(cookie.getSecure()) || request.isSecure())
                .sameSite(sameSite)
                .maxAge(Duration.ZERO)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, expired.toString());
    }

    private static String firstNonEmpty(String... candidates) {
        for (String candidate : candidates) {
            if (StringUtils.hasLength(candidate)) {
                return candidate;
            }
        }
        return null;
    }
}
