package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.newcafe.backend.common.security.Passwords;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.repository.UserRepository;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
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
@Import(BackendDatabaseIntegrationTest.DatabaseConfiguration.class)
class LoginIntegrationTest {

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

    @Test
    void signupThenLoginRestoresMemberAndRotatesSessionAndCsrf() throws Exception {
        String email = email();
        try (Browser browser = browser()) {
            HttpResponse<String> signup = browser.client().send(request("/api/v1/auth/signup")
                    .header("Content-Type", "application/json")
                    .header(browser.csrf().headerName(), browser.csrf().token())
                    .POST(HttpRequest.BodyPublishers.ofString(jsonMapper.writeValueAsString(Map.of(
                            "name", "단골 고객", "email", email,
                            "password", PASSWORD, "passwordConfirm", PASSWORD)))).build(),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(201, signup.statusCode(), signup.body());
            String previousSessionId = browser.sessionId();
            assertError(get(browser.client(), "/api/v1/my"), 401, "UNAUTHENTICATED");
            assertError(login(browser, email, PASSWORD.strip()), 401, "LOGIN_FAILED");

            HttpResponse<String> login = login(browser, "  " + email.toUpperCase(Locale.ROOT) + "  ", PASSWORD);
            JsonNode member = assertMember(login, email, "customer");
            assertNotEquals(previousSessionId, browser.sessionId());
            assertTrue(login.headers().allValues("Set-Cookie").stream()
                    .anyMatch(cookie -> cookie.startsWith("JSESSIONID=")));
            assertEquals(member, assertMember(get(browser.client(), "/api/v1/my"), email, "customer"));
            assertError(get(browser.client(), "/api/v1/admin/categories"), 403, "FORBIDDEN");

            try (HttpClient previousSession = client(new CookieManager(null, CookiePolicy.ACCEPT_ALL))) {
                HttpResponse<String> replay = previousSession.send(request("/api/v1/my")
                        .header("Cookie", "JSESSIONID=" + previousSessionId).GET().build(),
                        HttpResponse.BodyHandlers.ofString());
                assertError(replay, 401, "UNAUTHENTICATED");
            }

            // Replay proves the stored token was rotated; comparing XOR-masked token strings does not.
            assertError(login(browser, email, PASSWORD), 403, "CSRF_INVALID");
            Csrf refreshed = csrf(browser.client());
            HttpResponse<String> retry = browser.client().send(loginRequest(Map.of("email", email, "password", PASSWORD))
                    .header(refreshed.headerName(), refreshed.token()).build(), HttpResponse.BodyHandlers.ofString());
            assertMember(retry, email, "customer");
            assertMember(get(browser.client(), "/api/v1/my"), email, "customer");
        }
    }

    @Test
    void anonymousMyReturnsJsonUnauthorizedWithoutCreatingSessionOrRedirecting() throws Exception {
        try (HttpClient client = client(new CookieManager(null, CookiePolicy.ACCEPT_ALL))) {
            HttpResponse<String> response = get(client, "/api/v1/my");
            assertError(response, 401, "UNAUTHENTICATED");
            assertTrue(response.headers().allValues("Set-Cookie").isEmpty());
            assertTrue(response.headers().firstValue("Location").isEmpty());
            assertTrue(response.headers().firstValue("WWW-Authenticate").isEmpty());
        }
    }

    @Test
    void unknownWrongPasswordAndSuspendedMemberHaveIdenticalFailureResponse() throws Exception {
        String activeEmail = createMember();
        String suspendedEmail = createMember();
        jdbcTemplate.update("update users set status = 'suspended' where email = ?", suspendedEmail);
        try (Browser browser = browser()) {
            JsonNode unknown = assertError(login(browser, email(), PASSWORD), 401, "LOGIN_FAILED");
            JsonNode wrong = assertError(login(browser, activeEmail, "wrong-password"), 401, "LOGIN_FAILED");
            JsonNode suspended = assertError(login(browser, suspendedEmail, PASSWORD), 401, "LOGIN_FAILED");
            assertEquals(unknown, wrong);
            assertEquals(unknown, suspended);
            assertError(get(browser.client(), "/api/v1/my"), 401, "UNAUTHENTICATED");
        }
    }

    @Test
    void missingInvalidAndOtherSessionCsrfTokensCannotAuthenticate() throws Exception {
        String email = createMember();
        Map<String, String> input = Map.of("email", email, "password", PASSWORD);
        try (HttpClient noSession = client(new CookieManager(null, CookiePolicy.ACCEPT_ALL));
                Browser first = browser(); Browser second = browser()) {
            assertError(noSession.send(loginRequest(input).build(), HttpResponse.BodyHandlers.ofString()),
                    403, "CSRF_INVALID");
            assertError(first.client().send(loginRequest(input).header(first.csrf().headerName(), "invalid-token").build(),
                    HttpResponse.BodyHandlers.ofString()), 403, "CSRF_INVALID");
            assertError(second.client().send(loginRequest(input)
                    .header(first.csrf().headerName(), first.csrf().token()).build(), HttpResponse.BodyHandlers.ofString()),
                    403, "CSRF_INVALID");
            assertError(get(noSession, "/api/v1/my"), 401, "UNAUTHENTICATED");
            assertError(get(first.client(), "/api/v1/my"), 401, "UNAUTHENTICATED");
            assertError(get(second.client(), "/api/v1/my"), 401, "UNAUTHENTICATED");
        }
    }

    @Test
    void administratorRoleFromDatabaseAllowsExistingAdminApi() throws Exception {
        String email = createMember();
        jdbcTemplate.update("update users set role = 'admin' where email = ?", email);
        try (Browser browser = browser()) {
            assertMember(login(browser, email, PASSWORD), email, "admin");
            assertMember(get(browser.client(), "/api/v1/my"), email, "admin");
            HttpResponse<String> categories = get(browser.client(), "/api/v1/admin/categories");
            assertEquals(200, categories.statusCode(), categories.body());
            assertTrue(jsonMapper.readTree(categories.body()).isArray());
        }
    }

    @Test
    void myReadsCurrentDatabaseValuesAndIgnoresAnotherMemberIdInQuery() throws Exception {
        String email = createMember();
        Long otherId = userRepository.findByEmail(createMember()).orElseThrow().getId();
        try (Browser browser = browser()) {
            long ownId = assertMember(login(browser, email, PASSWORD), email, "customer").get("id").asLong();
            jdbcTemplate.update("update users set name = ? where email = ?", "변경한 이름", email);

            JsonNode current = assertMember(get(browser.client(), "/api/v1/my?id=" + otherId),
                    email, "customer", "변경한 이름");
            assertEquals(ownId, current.get("id").asLong());
            assertNotEquals(otherId.longValue(), current.get("id").asLong());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"long-password", "unicode-long-password", "short-password", "invalid-hash",
            "unknown-hash", "invalid-cost", "missing-password", "missing-email", "invalid-email"})
    void invalidCredentialsOrStoredHashesReturnUnauthorizedInsteadOfServerError(String invalid) throws Exception {
        String email = createMember();
        Map<String, String> input = new HashMap<>(Map.of("email", email, "password", PASSWORD));
        switch (invalid) {
            case "long-password" -> input.put("password", "a".repeat(73));
            case "unicode-long-password" -> input.put("password", "😀".repeat(19));
            case "short-password" -> input.put("password", "short");
            case "invalid-hash" -> jdbcTemplate.update(
                    "update users set password_hash = ? where email = ?", "{bcrypt}invalid", email);
            case "unknown-hash" -> jdbcTemplate.update(
                    "update users set password_hash = ? where email = ?", "{noop}" + PASSWORD, email);
            case "invalid-cost" -> jdbcTemplate.update("update users set password_hash = ? where email = ?",
                    "{bcrypt}$2a$99$" + "a".repeat(53), email);
            case "missing-password" -> input.remove("password");
            case "missing-email" -> input.remove("email");
            case "invalid-email" -> input.put("email", "invalid-email");
            default -> throw new IllegalArgumentException(invalid);
        }
        try (Browser browser = browser()) {
            HttpResponse<String> response = browser.client().send(loginRequest(input)
                    .header(browser.csrf().headerName(), browser.csrf().token()).build(), HttpResponse.BodyHandlers.ofString());
            assertError(response, 401, "LOGIN_FAILED");
            assertError(get(browser.client(), "/api/v1/my"), 401, "UNAUTHENTICATED");
        }
    }

    private String createMember() {
        String email = email();
        userRepository.saveAndFlush(User.createCustomer("단골 고객", email, passwords.encode(PASSWORD)));
        return email;
    }

    private Browser browser() throws Exception {
        CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        HttpClient client = client(cookies);
        return new Browser(client, cookies, csrf(client));
    }

    private Csrf csrf(HttpClient client) throws Exception {
        HttpResponse<String> response = get(client, "/api/v1/auth/csrf");
        assertEquals(200, response.statusCode(), response.body());
        assertNoStore(response);
        JsonNode csrf = jsonMapper.readTree(response.body());
        return new Csrf(csrf.get("headerName").asText(), csrf.get("token").asText());
    }

    private HttpClient client(CookieManager cookies) {
        return HttpClient.newBuilder().cookieHandler(cookies).followRedirects(HttpClient.Redirect.NEVER)
                .connectTimeout(Duration.ofSeconds(10)).build();
    }

    private HttpResponse<String> get(HttpClient client, String path) throws Exception {
        return client.send(request(path).GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> login(Browser browser, String email, String password) throws Exception {
        return browser.client().send(loginRequest(Map.of("email", email, "password", password))
                .header(browser.csrf().headerName(), browser.csrf().token()).build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpRequest.Builder loginRequest(Map<String, String> input) {
        String body = input.entrySet().stream().map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
        return request("/api/v1/auth/login").header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body));
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).timeout(Duration.ofSeconds(15));
    }

    private String email() {
        return "login-" + UUID.randomUUID() + "@example.com";
    }

    private JsonNode assertMember(HttpResponse<String> response, String email, String role) {
        return assertMember(response, email, role, "단골 고객");
    }

    private JsonNode assertMember(HttpResponse<String> response, String email, String role, String name) {
        assertEquals(200, response.statusCode(), response.body());
        assertJsonAndNoRedirect(response);
        JsonNode member = jsonMapper.readTree(response.body());
        assertEquals(5, member.size());
        assertTrue(member.get("id").asLong() > 0);
        assertEquals(name, member.get("name").asText());
        assertEquals(email, member.get("email").asText());
        assertEquals(role, member.get("role").asText());
        assertEquals("active", member.get("status").asText());
        assertFalse(response.body().contains("password"));
        assertFalse(response.body().contains(PASSWORD));
        assertFalse(response.body().contains("{bcrypt}"));
        return member;
    }

    private JsonNode assertError(HttpResponse<String> response, int status, String code) {
        assertEquals(status, response.statusCode(), response.body());
        assertJsonAndNoRedirect(response);
        JsonNode error = jsonMapper.readTree(response.body());
        assertEquals(2, error.size());
        assertEquals(code, error.get("code").asText());
        assertFalse(error.get("message").asText().isBlank());
        assertFalse(response.body().contains(PASSWORD));
        assertFalse(response.body().contains("{bcrypt}"));
        return error;
    }

    private void assertJsonAndNoRedirect(HttpResponse<String> response) {
        assertTrue(response.headers().firstValue("Content-Type").orElseThrow().contains("application/json"));
        assertTrue(response.headers().firstValue("Location").isEmpty());
        assertTrue(response.headers().firstValue("WWW-Authenticate").isEmpty());
        assertNoStore(response);
    }

    private void assertNoStore(HttpResponse<String> response) {
        assertTrue(response.headers().firstValue("Cache-Control").orElseThrow().contains("no-store"));
    }

    private record Csrf(String headerName, String token) {
    }

    private record Browser(HttpClient client, CookieManager cookies, Csrf csrf) implements AutoCloseable {
        String sessionId() {
            return cookies.getCookieStore().getCookies().stream().filter(cookie -> cookie.getName().equals("JSESSIONID"))
                    .findFirst().orElseThrow().getValue();
        }

        @Override
        public void close() {
            client.close();
        }
    }
}
