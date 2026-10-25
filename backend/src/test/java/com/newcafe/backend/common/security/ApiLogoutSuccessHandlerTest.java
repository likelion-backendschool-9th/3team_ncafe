package com.newcafe.backend.common.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ApiLogoutSuccessHandlerTest {

    @Test
    void returnsEmptyNoStoreResponseWithoutRedirectAndPreservesCookieHeaders() throws Exception {
        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();
        response.setHeader(HttpHeaders.LOCATION, "/previous-location");
        response.addHeader(HttpHeaders.SET_COOKIE, "JSESSIONID=; Path=/; Max-Age=0");
        String originalCookie = response.getHeader(HttpHeaders.SET_COOKIE);

        new ApiLogoutSuccessHandler().onLogoutSuccess(request, response, null);

        assertEquals(204, response.getStatus());
        assertEquals("no-store", response.getHeader(HttpHeaders.CACHE_CONTROL));
        assertNull(response.getHeader(HttpHeaders.LOCATION));
        assertEquals("", response.getContentAsString());
        assertEquals(originalCookie, response.getHeader(HttpHeaders.SET_COOKIE));
    }
}
