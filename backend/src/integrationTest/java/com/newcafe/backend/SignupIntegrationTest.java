package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.newcafe.backend.common.security.Passwords;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;
import com.newcafe.backend.repository.UserRepository;

import jakarta.servlet.ServletContext;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UserDetailsService;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.config.import=",
        "spring.sql.init.mode=never",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.security.allowed-origins=http://localhost:3000"
})
@Import(BackendDatabaseIntegrationTest.DatabaseConfiguration.class)
class SignupIntegrationTest {

    private static final String SIGNUP = "/api/v1/auth/signup";
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
    private ServletContext servletContext;

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    void csrfIssuesAnonymousSessionWithRequiredCookieAndCachePolicy() throws Exception {
        try (Browser browser = browser()) {
            JsonNode csrf = jsonMapper.readTree(browser.issuance().body());
            assertEquals("X-CSRF-TOKEN", csrf.get("headerName").asText());
            assertEquals("_csrf", csrf.get("parameterName").asText());
            assertFalse(csrf.get("token").asText().isBlank());
            assertNoStore(browser.issuance());

            String cookie = browser.issuance().headers().allValues("Set-Cookie").stream()
                    .filter(value -> value.startsWith("JSESSIONID="))
                    .findFirst().orElseThrow().toLowerCase(Locale.ROOT);
            assertTrue(cookie.contains("httponly"));
            assertTrue(cookie.contains("path=/"));
            assertTrue(cookie.contains("samesite=lax"));
            assertFalse(cookie.contains("secure"));
            assertFalse(cookie.contains("max-age="));
            assertEquals(30, servletContext.getSessionTimeout());
            assertTrue(applicationContext.getBeansOfType(UserDetailsService.class).isEmpty());
            assertUnauthenticated(get(browser.client(), "/api/v1/admin/categories"));
        }
    }

    @Test
    void signupPersistsActiveCustomerAndHashWithoutAuthenticatingSession() throws Exception {
        String email = email();
        Map<String, String> input = validInput("  " + email.toUpperCase(Locale.ROOT) + "  ");
        input.put("role", "admin");
        input.put("status", "suspended");
        try (Browser browser = browser()) {
            HttpResponse<String> response = signup(browser, jsonMapper.writeValueAsString(input));
            assertEquals(201, response.statusCode(), response.body());
            assertNoStore(response);
            JsonNode member = jsonMapper.readTree(response.body());
            assertEquals(5, member.size());
            assertTrue(member.get("id").asLong() > 0);
            assertEquals("단골 고객", member.get("name").asText());
            assertEquals(email, member.get("email").asText());
            assertEquals("customer", member.get("role").asText());
            assertEquals("active", member.get("status").asText());
            assertFalse(response.body().contains("password"));
            assertFalse(response.body().contains(PASSWORD));

            var persisted = userRepository.findByEmail(email).orElseThrow();
            assertEquals(member.get("id").asLong(), persisted.getId());
            assertEquals(UserRole.CUSTOMER, persisted.getRole());
            assertEquals(UserStatus.ACTIVE, persisted.getStatus());
            assertTrue(passwords.matches(PASSWORD, persisted.getPasswordHash()));
            assertFalse(passwords.matches(PASSWORD.strip(), persisted.getPasswordHash()));
            assertUnauthenticated(get(browser.client(), "/api/v1/admin/categories"));
            assertUnauthenticated(get(browser.client(), "/api/v1/my"));
        }
    }

    @Test
    void missingInvalidAndOtherSessionCsrfTokensCannotCreateMembers() throws Exception {
        String email = email();
        String body = payload(email);
        long before = userRepository.count();
        try (HttpClient noSession = client(); Browser first = browser(); Browser second = browser()) {
            assertError(noSession.send(signupRequest(body).build(), HttpResponse.BodyHandlers.ofString()),
                    403, "CSRF_INVALID");
            assertError(first.client().send(signupRequest(body).header(first.headerName(), "invalid-token").build(),
                    HttpResponse.BodyHandlers.ofString()), 403, "CSRF_INVALID");
            assertError(second.client().send(signupRequest(body).header(first.headerName(), first.token()).build(),
                    HttpResponse.BodyHandlers.ofString()), 403, "CSRF_INVALID");
        }
        assertEquals(before, userRepository.count());
        assertFalse(userRepository.existsByEmail(email));
    }

    @ParameterizedTest
    @ValueSource(strings = {"missing-name", "invalid-email", "short-password", "password-mismatch",
            "missing-confirm", "name-too-long", "password-too-long", "all-null",
            "null-name-character", "null-email-character"})
    void invalidSignupInputReturnsValidationErrorWithoutWriting(String invalidField) throws Exception {
        Map<String, String> input = validInput(email());
        switch (invalidField) {
            case "missing-name" -> input.remove("name");
            case "invalid-email" -> input.put("email", "invalid-email");
            case "short-password" -> {
                input.put("password", "short");
                input.put("passwordConfirm", "short");
            }
            case "password-mismatch" -> input.put("passwordConfirm", "different-password");
            case "missing-confirm" -> input.remove("passwordConfirm");
            case "name-too-long" -> input.put("name", "😀".repeat(51));
            case "password-too-long" -> {
                input.put("password", "a".repeat(73));
                input.put("passwordConfirm", "a".repeat(73));
            }
            case "all-null" -> input.replaceAll((field, value) -> null);
            case "null-name-character" -> input.put("name", "단골\u0000고객");
            case "null-email-character" -> input.put("email", "member\u0000@example.com");
            default -> throw new IllegalArgumentException(invalidField);
        }
        long before = userRepository.count();
        try (Browser browser = browser()) {
            assertError(signup(browser, jsonMapper.writeValueAsString(input)), 400, "VALIDATION_ERROR");
        }
        assertEquals(before, userRepository.count());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{\"email\":", "null"})
    void malformedOrNullJsonReturnsJsonBadRequestWithoutWriting(String body) throws Exception {
        long before = userRepository.count();
        try (Browser browser = browser()) {
            assertError(signup(browser, body), 400, "INVALID_REQUEST");
        }
        assertEquals(before, userRepository.count());
    }

    @Test
    void duplicateEmailUsesNormalizedValueAndReturnsConflict() throws Exception {
        String email = email();
        try (Browser browser = browser()) {
            assertEquals(201, signup(browser, payload(email)).statusCode());
            assertError(signup(browser, payload("  " + email.toUpperCase(Locale.ROOT) + "  ")),
                    409, "EMAIL_ALREADY_EXISTS");
        }
        assertEquals(1L, countEmail(email));
    }

    @Test
    void concurrentNormalizedSignupsCommitExactlyOneMember() throws Exception {
        String email = email();
        try (Browser first = browser(); Browser second = browser()) {
            var one = first.client().sendAsync(signupRequest(payload(email))
                    .header(first.headerName(), first.token()).build(), HttpResponse.BodyHandlers.ofString());
            var two = second.client().sendAsync(signupRequest(payload(" " + email.toUpperCase(Locale.ROOT) + " "))
                    .header(second.headerName(), second.token()).build(), HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> responseOne = one.join();
            HttpResponse<String> responseTwo = two.join();
            assertEquals(List.of(201, 409), List.of(responseOne.statusCode(), responseTwo.statusCode())
                    .stream().sorted().toList(), responseOne.body() + " / " + responseTwo.body());
            assertError(responseOne.statusCode() == 409 ? responseOne : responseTwo,
                    409, "EMAIL_ALREADY_EXISTS");
        }
        assertEquals(1L, countEmail(email));
    }

    @Test
    void corsPreflightAllowsConfiguredOriginAndRejectsOtherOrigins() throws Exception {
        try (HttpClient client = client()) {
            HttpResponse<String> allowed = preflight(client, "http://localhost:3000");
            assertEquals(200, allowed.statusCode());
            assertEquals("http://localhost:3000", allowed.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
            assertEquals("true", allowed.headers().firstValue("Access-Control-Allow-Credentials").orElseThrow());
            assertTrue(allowed.headers().firstValue("Access-Control-Allow-Methods").orElseThrow().contains("POST"));

            HttpResponse<String> denied = preflight(client, "http://localhost:3001");
            assertEquals(403, denied.statusCode());
            assertTrue(denied.headers().firstValue("Access-Control-Allow-Origin").isEmpty());
        }
    }

    private Browser browser() throws Exception {
        HttpClient client = client();
        HttpResponse<String> response = get(client, "/api/v1/auth/csrf");
        assertEquals(200, response.statusCode(), response.body());
        JsonNode csrf = jsonMapper.readTree(response.body());
        return new Browser(client, csrf.get("headerName").asText(), csrf.get("token").asText(), response);
    }

    private HttpClient client() {
        return HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .followRedirects(HttpClient.Redirect.NEVER).connectTimeout(Duration.ofSeconds(10)).build();
    }

    private HttpResponse<String> get(HttpClient client, String path) throws Exception {
        return client.send(request(path).GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> signup(Browser browser, String body) throws Exception {
        return browser.client().send(signupRequest(body).header(browser.headerName(), browser.token()).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private HttpRequest.Builder signupRequest(String body) {
        return request(SIGNUP).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).timeout(Duration.ofSeconds(15));
    }

    private HttpResponse<String> preflight(HttpClient client, String origin) throws Exception {
        return client.send(request(SIGNUP).method("OPTIONS", HttpRequest.BodyPublishers.noBody())
                .header("Origin", origin).header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type,x-csrf-token").build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private String payload(String email) {
        return jsonMapper.writeValueAsString(validInput(email));
    }

    private Map<String, String> validInput(String email) {
        return new HashMap<>(Map.of("name", "  단골 고객  ", "email", email,
                "password", PASSWORD, "passwordConfirm", PASSWORD));
    }

    private String email() {
        return "member-" + UUID.randomUUID() + "@example.com";
    }

    private long countEmail(String email) {
        return jdbcTemplate.queryForObject("select count(*) from users where email = ?", Long.class, email);
    }

    private void assertUnauthenticated(HttpResponse<String> response) {
        assertError(response, 401, "UNAUTHENTICATED");
        assertTrue(response.headers().firstValue("Location").isEmpty());
        assertTrue(response.headers().firstValue("WWW-Authenticate").isEmpty());
    }

    private void assertError(HttpResponse<String> response, int status, String code) {
        assertEquals(status, response.statusCode(), response.body());
        assertTrue(response.headers().firstValue("Content-Type").orElseThrow().contains("application/json"));
        JsonNode error = jsonMapper.readTree(response.body());
        assertEquals(code, error.get("code").asText());
        assertFalse(error.get("message").asText().isBlank());
        assertFalse(response.body().contains(PASSWORD));
    }

    private void assertNoStore(HttpResponse<String> response) {
        assertTrue(response.headers().firstValue("Cache-Control").orElseThrow().contains("no-store"));
    }

    private record Browser(HttpClient client, String headerName, String token, HttpResponse<String> issuance)
            implements AutoCloseable {
        @Override
        public void close() {
            client.close();
        }
    }
}
