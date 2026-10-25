package com.newcafe.backend.common.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.boot.web.server.Cookie;
import org.springframework.boot.web.server.autoconfigure.ServerProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class SessionCookieLogoutHandlerTest {

    @Test
    void expiresLocalSessionCookieWithoutInvalidatingSessionOrReplacingOtherCookies() {
        ServerProperties properties = new ServerProperties();
        Cookie cookie = properties.getServlet().getSession().getCookie();
        cookie.setName("JSESSIONID");
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setSameSite(Cookie.SameSite.LAX);
        var request = new MockHttpServletRequest();
        var session = request.getSession();
        var response = new MockHttpServletResponse();
        response.addHeader(HttpHeaders.SET_COOKIE, "other=value; Path=/");

        new SessionCookieLogoutHandler(properties).logout(request, response, null);

        assertEquals(2, response.getHeaders(HttpHeaders.SET_COOKIE).size());
        String header = response.getHeaders(HttpHeaders.SET_COOKIE).stream()
                .filter(value -> value.startsWith("JSESSIONID=")).findFirst().orElseThrow();
        assertTrue(header.startsWith("JSESSIONID=;"));
        assertTrue(header.contains("Path=/;"));
        assertTrue(header.contains("Max-Age=0"));
        assertTrue(header.contains("HttpOnly"));
        assertTrue(header.contains("SameSite=Lax"));
        assertFalse(header.contains("Secure"));
        assertFalse(header.contains("Domain="));
        assertSame(session, request.getSession(false));
    }

    @Test
    void honorsProductionSecureFlagAndConfiguredCookieIdentityOnHttpRequest() {
        ServerProperties properties = new ServerProperties();
        Cookie cookie = properties.getServlet().getSession().getCookie();
        cookie.setName("NCAFE_SESSION");
        cookie.setPath("/cafe");
        cookie.setDomain("example.com");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setSameSite(Cookie.SameSite.STRICT);

        String header = expire(properties, new MockHttpServletRequest());

        assertTrue(header.startsWith("NCAFE_SESSION=;"));
        assertTrue(header.contains("Path=/cafe;"));
        assertTrue(header.contains("Domain=example.com;"));
        assertTrue(header.contains("Max-Age=0"));
        assertTrue(header.contains("Secure"));
        assertTrue(header.contains("HttpOnly"));
        assertTrue(header.contains("SameSite=Strict"));
    }

    @Test
    void usesActualServletCookieIdentityWhenRuntimeConfigurationOverridesProperties() {
        ServerProperties properties = new ServerProperties();
        properties.getServlet().getSession().getCookie().setName("CONFIGURED_SESSION");
        var request = new MockHttpServletRequest();
        var actual = request.getServletContext().getSessionCookieConfig();
        actual.setName("ACTUAL_SESSION");
        actual.setPath("/actual");
        actual.setDomain("actual.example.com");

        String header = expire(properties, request);

        assertTrue(header.startsWith("ACTUAL_SESSION=;"));
        assertTrue(header.contains("Path=/actual;"));
        assertTrue(header.contains("Domain=actual.example.com;"));
    }

    @Test
    void fallsBackToContextPathAndSecureRequestWhenCookiePropertiesAreAbsent() {
        var request = new MockHttpServletRequest();
        request.setContextPath("/cafe");
        request.setSecure(true);

        String header = expire(new ServerProperties(), request);

        assertTrue(header.startsWith("JSESSIONID=;"));
        assertTrue(header.contains("Path=/cafe;"));
        assertTrue(header.contains("Secure"));
        assertTrue(header.contains("HttpOnly"));
        assertFalse(header.contains("Domain="));
    }

    @Test
    void usesRootPathAndOmitsExplicitlyDisabledCookieAttributes() {
        ServerProperties properties = new ServerProperties();
        Cookie cookie = properties.getServlet().getSession().getCookie();
        cookie.setHttpOnly(false);
        cookie.setSecure(false);
        cookie.setSameSite(Cookie.SameSite.OMITTED);

        String header = expire(properties, new MockHttpServletRequest());

        assertTrue(header.contains("Path=/;"));
        assertTrue(header.contains("Max-Age=0"));
        assertFalse(header.contains("HttpOnly"));
        assertFalse(header.contains("Secure"));
        assertFalse(header.contains("SameSite="));
    }

    private static String expire(ServerProperties properties, MockHttpServletRequest request) {
        var response = new MockHttpServletResponse();
        new SessionCookieLogoutHandler(properties).logout(request, response, null);
        return response.getHeader(HttpHeaders.SET_COOKIE);
    }
}
