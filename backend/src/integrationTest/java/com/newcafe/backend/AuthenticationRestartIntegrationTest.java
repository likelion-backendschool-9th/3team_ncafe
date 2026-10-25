package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.newcafe.backend.common.security.Passwords;
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
import java.util.Map;
import java.util.UUID;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.postgresql.PostgreSQLContainer;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class AuthenticationRestartIntegrationTest {

    private static final String PASSWORD = " 비밀번호123! ";

    @Test
    void applicationRestartKeepsMemberAndHashButDiscardsSessionAndCsrf() throws Exception {
        try (PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine")
                .withDatabaseName("ncafe_restart_test")
                .withUsername("ncafe_restart_test")
                .withPassword("ncafe_restart_test")
                .withReuse(false)) {
            postgres.start();
            String email = "restart-" + UUID.randomUUID() + "@example.com";
            CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
            try (HttpClient client = HttpClient.newBuilder().cookieHandler(cookies)
                    .followRedirects(HttpClient.Redirect.NEVER).connectTimeout(Duration.ofSeconds(10)).build()) {
                SavedMember saved;
                Csrf oldCsrf;
                String oldSession;
                // The database and browser survive; only the actual application context is closed.
                try (ConfigurableApplicationContext first = application(postgres)) {
                    assertIsolatedDatabase(first, postgres);
                    int port = port(first);
                    JsonMapper json = first.getBean(JsonMapper.class);
                    Csrf anonymous = csrf(client, port, json);
                    HttpResponse<String> signup = client.send(request(port, "/api/v1/auth/signup")
                            .header("Content-Type", "application/json")
                            .header(anonymous.headerName(), anonymous.token())
                            .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of(
                                    "name", "단골 고객", "email", email,
                                    "password", PASSWORD, "passwordConfirm", PASSWORD)))).build(),
                            HttpResponse.BodyHandlers.ofString());
                    assertEquals(201, signup.statusCode(), signup.body());
                    assertMember(login(client, port, anonymous, email), json, email);
                    JsonNode current = assertMember(get(client, port, "/api/v1/my"), json, email);
                    var member = first.getBean(UserRepository.class).findByEmail(email).orElseThrow();
                    saved = new SavedMember(member.getId(), member.getPasswordHash());
                    assertEquals(saved.id().longValue(), current.get("id").asLong());
                    assertNotEquals(PASSWORD, saved.passwordHash());
                    assertTrue(saved.passwordHash().startsWith("{bcrypt}"));
                    assertTrue(first.getBean(Passwords.class).matches(PASSWORD, saved.passwordHash()));
                    oldCsrf = csrf(client, port, json);
                    oldSession = sessionId(cookies);
                }

                try (ConfigurableApplicationContext second = application(postgres)) {
                    assertIsolatedDatabase(second, postgres);
                    int port = port(second);
                    JsonMapper json = second.getBean(JsonMapper.class);
                    UserRepository users = second.getBean(UserRepository.class);
                    var persisted = users.findByEmail(email).orElseThrow();
                    assertEquals(1L, users.count());
                    assertEquals(saved.id(), persisted.getId());
                    assertEquals(saved.passwordHash(), persisted.getPasswordHash());
                    assertNotEquals(PASSWORD, persisted.getPasswordHash());
                    assertTrue(second.getBean(Passwords.class).matches(PASSWORD, persisted.getPasswordHash()));

                    // HTTP cookies belong to the host/path, so this same browser sends the old cookie on the new port.
                    assertEquals(oldSession, sessionId(cookies));
                    assertError(get(client, port, "/api/v1/my"), json, 401, "UNAUTHENTICATED");
                    assertError(login(client, port, oldCsrf, email), json, 403, "CSRF_INVALID");
                    assertError(get(client, port, "/api/v1/my"), json, 401, "UNAUTHENTICATED");

                    Csrf fresh = csrf(client, port, json);
                    JsonNode authenticated = assertMember(login(client, port, fresh, email), json, email);
                    assertEquals(saved.id().longValue(), authenticated.get("id").asLong());
                    assertNotEquals(oldSession, sessionId(cookies));
                    assertEquals(authenticated, assertMember(get(client, port, "/api/v1/my"), json, email));
                    assertEquals(saved.passwordHash(), users.findByEmail(email).orElseThrow().getPasswordHash());
                }
            }
        }
    }

    private ConfigurableApplicationContext application(PostgreSQLContainer postgres) {
        return new SpringApplicationBuilder(BackendApplication.class)
                .web(WebApplicationType.SERVLET)
                .registerShutdownHook(false)
                .run("--server.port=0", "--server.address=127.0.0.1",
                        "--spring.profiles.active=restart-test", "--spring.main.banner-mode=off",
                        "--spring.config.import=", "--spring.sql.init.mode=never",
                        "--spring.jpa.hibernate.ddl-auto=update",
                        "--spring.datasource.url=" + postgres.getJdbcUrl(),
                        "--spring.datasource.username=" + postgres.getUsername(),
                        "--spring.datasource.password=" + postgres.getPassword(),
                        "--server.servlet.session.persistent=false", "--server.servlet.session.cookie.secure=false",
                        "--app.security.allowed-origins=http://localhost:3000");
    }

    private void assertIsolatedDatabase(ConfigurableApplicationContext context, PostgreSQLContainer postgres)
            throws Exception {
        try (var connection = context.getBean(DataSource.class).getConnection()) {
            assertEquals(postgres.getJdbcUrl(), connection.getMetaData().getURL());
            assertEquals("ncafe_restart_test", connection.getCatalog());
            assertEquals("PostgreSQL", connection.getMetaData().getDatabaseProductName());
        }
    }

    private int port(ConfigurableApplicationContext context) {
        return context.getEnvironment().getRequiredProperty("local.server.port", Integer.class);
    }

    private Csrf csrf(HttpClient client, int port, JsonMapper json) throws Exception {
        HttpResponse<String> response = get(client, port, "/api/v1/auth/csrf");
        assertEquals(200, response.statusCode(), response.body());
        assertNoStore(response);
        JsonNode csrf = json.readTree(response.body());
        return new Csrf(csrf.get("headerName").asText(), csrf.get("token").asText());
    }

    private HttpResponse<String> login(HttpClient client, int port, Csrf csrf, String email) throws Exception {
        String form = "email=" + URLEncoder.encode(email, StandardCharsets.UTF_8)
                + "&password=" + URLEncoder.encode(PASSWORD, StandardCharsets.UTF_8);
        return client.send(request(port, "/api/v1/auth/login")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header(csrf.headerName(), csrf.token()).POST(HttpRequest.BodyPublishers.ofString(form)).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> get(HttpClient client, int port, String path) throws Exception {
        return client.send(request(port, path).GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpRequest.Builder request(int port, String path) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).timeout(Duration.ofSeconds(15));
    }

    private String sessionId(CookieManager cookies) {
        return cookies.getCookieStore().getCookies().stream().filter(cookie -> cookie.getName().equals("JSESSIONID"))
                .findFirst().orElseThrow().getValue();
    }

    private JsonNode assertMember(HttpResponse<String> response, JsonMapper json, String email) {
        assertEquals(200, response.statusCode(), response.body());
        assertJson(response);
        JsonNode member = json.readTree(response.body());
        assertEquals(5, member.size());
        assertEquals("단골 고객", member.get("name").asText());
        assertEquals(email, member.get("email").asText());
        assertEquals("customer", member.get("role").asText());
        assertEquals("active", member.get("status").asText());
        assertFalse(response.body().contains("password"));
        assertFalse(response.body().contains(PASSWORD));
        assertFalse(response.body().contains("{bcrypt}"));
        return member;
    }

    private void assertError(HttpResponse<String> response, JsonMapper json, int status, String code) {
        assertEquals(status, response.statusCode(), response.body());
        assertJson(response);
        JsonNode error = json.readTree(response.body());
        assertEquals(2, error.size());
        assertEquals(code, error.get("code").asText());
        assertFalse(error.get("message").asText().isBlank());
        assertFalse(response.body().contains(PASSWORD));
        assertFalse(response.body().contains("{bcrypt}"));
    }

    private void assertJson(HttpResponse<String> response) {
        assertTrue(response.headers().firstValue("Content-Type").orElseThrow().contains("application/json"));
        assertTrue(response.headers().firstValue("Location").isEmpty());
        assertTrue(response.headers().firstValue("WWW-Authenticate").isEmpty());
        assertNoStore(response);
    }

    private void assertNoStore(HttpResponse<String> response) {
        assertTrue(response.headers().firstValue("Cache-Control").orElseThrow().contains("no-store"));
    }

    private record SavedMember(Long id, String passwordHash) {
    }

    private record Csrf(String headerName, String token) {
    }
}
