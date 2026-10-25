package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.newcafe.backend.common.security.Passwords;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.repository.UserRepository;

import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionIdListener;
import jakarta.servlet.http.HttpSessionListener;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.HttpCookie;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.web.servlet.ServletListenerRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.config.import=",
        "spring.sql.init.mode=never",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.security.allowed-origins=http://localhost:3000"
})
@Import({BackendDatabaseIntegrationTest.DatabaseConfiguration.class,
        SessionLifecycleIntegrationTest.SessionTracking.class})
class SessionLifecycleIntegrationTest {

    private static final String LOGOUT = "/api/v1/auth/logout";
    private static final String PASSWORD = " 비밀번호123! ";

    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private Passwords passwords;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private Sessions sessions;

    @Test
    void logoutExpiresCookieAndDiscardsSessionAndOldCsrf() throws Exception {
        try (Browser browser = loggedIn(createMember())) {
            String oldSession = browser.sessionId();
            Csrf oldCsrf = browser.csrf();
            assertLoggedOut(logout(browser, oldCsrf));
            assertTrue(browser.cookies().getCookieStore().getCookies().stream()
                    .noneMatch(cookie -> cookie.getName().equals("JSESSIONID")));

            try (HttpClient replay = client(new CookieManager(null, CookiePolicy.ACCEPT_ALL))) {
                assertError(replay.send(request("/api/v1/my").header("Cookie", "JSESSIONID=" + oldSession)
                        .GET().build(), HttpResponse.BodyHandlers.ofString()), 401, "UNAUTHENTICATED");
            }
            assertError(logout(browser, oldCsrf), 403, "CSRF_INVALID");
            assertLoggedOut(logout(browser, csrf(browser.client())));
            assertError(get(browser.client(), "/api/v1/my"), 401, "UNAUTHENTICATED");
        }
    }

    @Test
    void getLogoutDoesNotEndAuthenticatedSession() throws Exception {
        String email = createMember();
        try (Browser browser = loggedIn(email)) {
            String sessionId = browser.sessionId();
            HttpResponse<String> response = get(browser.client(), LOGOUT);
            assertTrue(response.statusCode() == 404 || response.statusCode() == 405, response.body());
            assertMy(browser, email, "customer");
            assertEquals(sessionId, browser.sessionId());
        }
    }

    @Test
    void missingInvalidAndCrossSessionCsrfCannotLogOutAuthenticatedMember() throws Exception {
        String email = createMember();
        try (Browser browser = loggedIn(email); Browser other = browser()) {
            assertError(browser.client().send(logoutRequest().build(), HttpResponse.BodyHandlers.ofString()),
                    403, "CSRF_INVALID");
            assertMy(browser, email, "customer");
            assertError(logout(browser, new Csrf(browser.csrf().headerName(), "invalid-token")),
                    403, "CSRF_INVALID");
            assertMy(browser, email, "customer");
            assertError(logout(browser, other.csrf()), 403, "CSRF_INVALID");
            assertMy(browser, email, "customer");
        }
    }

    @Test
    void logoutOnlyEndsTheRequestingDeviceSession() throws Exception {
        String email = createMember();
        try (Browser first = loggedIn(email); Browser second = loggedIn(email)) {
            assertNotEquals(first.sessionId(), second.sessionId());
            assertLoggedOut(logout(first, first.csrf()));
            assertError(get(first.client(), "/api/v1/my"), 401, "UNAUTHENTICATED");
            assertMy(second, email, "customer");
        }
    }

    @Test
    void anonymousSessionWithValidCsrfCanLogOut() throws Exception {
        try (Browser browser = browser()) {
            assertLoggedOut(logout(browser, browser.csrf()));
            assertError(get(browser.client(), "/api/v1/my"), 401, "UNAUTHENTICATED");
        }
    }

    @Test
    void suspendedMemberIsForbiddenThenLosesAuthenticatedSession() throws Exception {
        String email = createMember();
        try (Browser browser = loggedIn(email)) {
            jdbcTemplate.update("update users set status = 'suspended' where email = ?", email);
            HttpResponse<String> response = get(browser.client(), "/api/v1/my");
            assertError(response, 403, "FORBIDDEN");
            assertExpiredCookie(response);
            assertError(get(browser.client(), "/api/v1/my"), 401, "UNAUTHENTICATED");
        }
    }

    @Test
    void deletedMemberLosesAuthenticatedSessionImmediately() throws Exception {
        String email = createMember();
        try (Browser browser = loggedIn(email)) {
            jdbcTemplate.update("delete from users where email = ?", email);
            HttpResponse<String> response = get(browser.client(), "/api/v1/my");
            assertError(response, 401, "UNAUTHENTICATED");
            assertExpiredCookie(response);
            assertError(get(browser.client(), "/api/v1/my"), 401, "UNAUTHENTICATED");
        }
    }

    @Test
    void suspendedMemberCanStillLogOutWithValidStoredCsrf() throws Exception {
        String email = createMember();
        try (Browser browser = loggedIn(email)) {
            jdbcTemplate.update("update users set status = 'suspended' where email = ?", email);
            assertLoggedOut(logout(browser, browser.csrf()));
            assertError(get(browser.client(), "/api/v1/my"), 401, "UNAUTHENTICATED");
        }
    }

    @Test
    void roleChangesInDatabaseTakeEffectOnTheNextProtectedRequest() throws Exception {
        String email = createMember();
        try (Browser browser = loggedIn(email)) {
            assertError(get(browser.client(), "/api/v1/admin/categories"), 403, "FORBIDDEN");
            jdbcTemplate.update("update users set role = 'admin' where email = ?", email);
            HttpResponse<String> promoted = get(browser.client(), "/api/v1/admin/categories");
            assertEquals(200, promoted.statusCode(), promoted.body());
            assertTrue(jsonMapper.readTree(promoted.body()).isArray());
            assertMy(browser, email, "admin");

            jdbcTemplate.update("update users set role = 'customer' where email = ?", email);
            assertError(get(browser.client(), "/api/v1/admin/categories"), 403, "FORBIDDEN");
            assertMy(browser, email, "customer");
        }
    }

    @Test
    void forgedSessionCookieCannotAuthenticate() throws Exception {
        try (HttpClient client = client(new CookieManager(null, CookiePolicy.ACCEPT_ALL))) {
            assertError(client.send(request("/api/v1/my").header("Cookie", "JSESSIONID=" + UUID.randomUUID())
                    .GET().build(), HttpResponse.BodyHandlers.ofString()), 401, "UNAUTHENTICATED");
        }
    }

    @Test
    void realServletSessionExpiresAfterItsIdleInterval() throws Exception {
        try (Browser browser = loggedIn(createMember())) {
            HttpSession session = sessions.current.get(browser.sessionId());
            assertNotNull(session);
            assertEquals(30, session.getServletContext().getSessionTimeout());
            assertEquals(1800, session.getMaxInactiveInterval());
            // Shorten only this real test session; production keeps its configured thirty-minute interval.
            session.setMaxInactiveInterval(1);
            Thread.sleep(1200);

            assertError(get(browser.client(), "/api/v1/my"), 401, "UNAUTHENTICATED");
            assertError(logout(browser, browser.csrf()), 403, "CSRF_INVALID");
            assertLoggedOut(logout(browser, csrf(browser.client())));
        }
    }

    private String createMember() {
        String email = "session-" + UUID.randomUUID() + "@example.com";
        userRepository.saveAndFlush(User.createCustomer("단골 고객", email, passwords.encode(PASSWORD)));
        return email;
    }

    private Browser browser() throws Exception {
        CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        HttpClient client = client(cookies);
        return new Browser(client, cookies, csrf(client));
    }

    private Browser loggedIn(String email) throws Exception {
        Browser browser = browser();
        String body = "email=" + URLEncoder.encode(email, StandardCharsets.UTF_8)
                + "&password=" + URLEncoder.encode(PASSWORD, StandardCharsets.UTF_8);
        HttpResponse<String> response = browser.client().send(request("/api/v1/auth/login")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header(browser.csrf().headerName(), browser.csrf().token())
                .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode(), response.body());
        return new Browser(browser.client(), browser.cookies(), csrf(browser.client()));
    }

    private HttpClient client(CookieManager cookies) {
        return HttpClient.newBuilder().cookieHandler(cookies).followRedirects(HttpClient.Redirect.NEVER)
                .connectTimeout(Duration.ofSeconds(10)).build();
    }

    private Csrf csrf(HttpClient client) throws Exception {
        HttpResponse<String> response = get(client, "/api/v1/auth/csrf");
        assertEquals(200, response.statusCode(), response.body());
        JsonNode csrf = jsonMapper.readTree(response.body());
        return new Csrf(csrf.get("headerName").asText(), csrf.get("token").asText());
    }

    private HttpResponse<String> get(HttpClient client, String path) throws Exception {
        return client.send(request(path).GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> logout(Browser browser, Csrf csrf) throws Exception {
        return browser.client().send(logoutRequest().header(csrf.headerName(), csrf.token()).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private HttpRequest.Builder logoutRequest() {
        return request(LOGOUT).POST(HttpRequest.BodyPublishers.noBody());
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).timeout(Duration.ofSeconds(15));
    }

    private void assertMy(Browser browser, String email, String role) throws Exception {
        HttpResponse<String> response = get(browser.client(), "/api/v1/my");
        assertEquals(200, response.statusCode(), response.body());
        assertNoStore(response);
        JsonNode member = jsonMapper.readTree(response.body());
        assertEquals(5, member.size());
        assertEquals(email, member.get("email").asText());
        assertEquals(role, member.get("role").asText());
        assertEquals("active", member.get("status").asText());
        assertFalse(response.body().contains("password"));
        assertFalse(response.body().contains("{bcrypt}"));
    }

    private void assertLoggedOut(HttpResponse<String> response) {
        assertEquals(204, response.statusCode(), response.body());
        assertEquals("", response.body());
        assertNoStore(response);
        assertTrue(response.headers().firstValue("Location").isEmpty());
        assertExpiredCookie(response);
    }

    private void assertExpiredCookie(HttpResponse<String> response) {
        HttpCookie expired = response.headers().allValues("Set-Cookie").stream()
                .flatMap(value -> HttpCookie.parse(value).stream())
                .filter(cookie -> cookie.getName().equals("JSESSIONID")).findFirst().orElseThrow();
        assertEquals(0L, expired.getMaxAge());
        assertEquals("", expired.getValue());
        assertEquals("/", expired.getPath());
        assertNull(expired.getDomain());
    }

    private void assertError(HttpResponse<String> response, int status, String code) {
        assertEquals(status, response.statusCode(), response.body());
        assertTrue(response.headers().firstValue("Content-Type").orElseThrow().contains("application/json"));
        assertNoStore(response);
        JsonNode error = jsonMapper.readTree(response.body());
        assertEquals(code, error.get("code").asText());
        assertFalse(error.get("message").asText().isBlank());
        assertFalse(response.body().contains(PASSWORD));
        assertFalse(response.body().contains("{bcrypt}"));
    }

    private void assertNoStore(HttpResponse<String> response) {
        assertTrue(response.headers().firstValue("Cache-Control").orElseThrow().contains("no-store"));
    }

    private record Csrf(String headerName, String token) {
    }

    private record Browser(HttpClient client, CookieManager cookies, Csrf csrf) implements AutoCloseable {
        String sessionId() {
            return cookies.getCookieStore().getCookies().stream()
                    .filter(cookie -> cookie.getName().equals("JSESSIONID")).findFirst().orElseThrow().getValue();
        }

        @Override
        public void close() {
            client.close();
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class SessionTracking {
        @Bean
        Sessions sessions() {
            return new Sessions();
        }

        @Bean
        ServletListenerRegistrationBean<Sessions> sessionListener(Sessions sessions) {
            return new ServletListenerRegistrationBean<>(sessions);
        }
    }

    static class Sessions implements HttpSessionListener, HttpSessionIdListener {
        private final Map<String, HttpSession> current = new ConcurrentHashMap<>();

        @Override
        public void sessionCreated(HttpSessionEvent event) {
            current.put(event.getSession().getId(), event.getSession());
        }

        @Override
        public void sessionDestroyed(HttpSessionEvent event) {
            current.remove(event.getSession().getId());
        }

        @Override
        public void sessionIdChanged(HttpSessionEvent event, String oldSessionId) {
            current.remove(oldSessionId);
            current.put(event.getSession().getId(), event.getSession());
        }
    }
}
