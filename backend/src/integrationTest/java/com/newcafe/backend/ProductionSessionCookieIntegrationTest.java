package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.HttpCookie;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.config.import=",
        "spring.sql.init.mode=never",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@ActiveProfiles("prod")
@Import(BackendDatabaseIntegrationTest.DatabaseConfiguration.class)
class ProductionSessionCookieIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    @Test
    void productionProfileIssuesSecureSessionCookie() throws Exception {
        try (HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:" + port + "/api/v1/auth/csrf"))
                    .timeout(Duration.ofSeconds(10))
                    .GET().build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            assertEquals(200, response.statusCode());
            String cookie = response.headers().allValues("Set-Cookie").stream()
                    .filter(value -> value.startsWith("JSESSIONID="))
                    .findFirst().orElseThrow().toLowerCase(Locale.ROOT);
            assertTrue(cookie.contains("secure"));
            assertTrue(cookie.contains("httponly"));
            assertTrue(cookie.contains("samesite=lax"));
            assertTrue(cookie.contains("path=/"));
            assertFalse(cookie.contains("max-age="));
        }
    }

    @Test
    void productionLogoutExpiresTheIssuedSecureSessionCookieWithMatchingAttributes() throws Exception {
        try (HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
            URI base = URI.create("http://localhost:" + port);
            HttpResponse<String> csrfResponse = client.send(HttpRequest.newBuilder()
                    .uri(base.resolve("/api/v1/auth/csrf")).timeout(Duration.ofSeconds(10)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, csrfResponse.statusCode(), csrfResponse.body());
            String issuedHeader = csrfResponse.headers().allValues("Set-Cookie").stream()
                    .filter(value -> value.startsWith("JSESSIONID=")).findFirst().orElseThrow();
            HttpCookie issued = HttpCookie.parse(issuedHeader).getFirst();
            var csrf = jsonMapper.readTree(csrfResponse.body());

            // Secure cookies are not automatically sent over this HTTP test connection.
            // Send the cookie explicitly to verify production cookie attributes, not browser HTTPS delivery.
            HttpResponse<String> response = client.send(HttpRequest.newBuilder()
                    .uri(base.resolve("/api/v1/auth/logout")).timeout(Duration.ofSeconds(10))
                    .header("Cookie", issued.getName() + "=" + issued.getValue())
                    .header(csrf.get("headerName").asText(), csrf.get("token").asText())
                    .POST(HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());

            assertEquals(204, response.statusCode(), response.body());
            assertEquals("", response.body());
            assertTrue(response.headers().firstValue("Cache-Control").orElseThrow().contains("no-store"));
            assertTrue(response.headers().firstValue("Location").isEmpty());
            String expiredHeader = response.headers().allValues("Set-Cookie").stream()
                    .filter(value -> value.startsWith("JSESSIONID=")).findFirst().orElseThrow();
            HttpCookie expired = HttpCookie.parse(expiredHeader).getFirst();
            assertEquals(issued.getName(), expired.getName());
            assertEquals("/", issued.getPath());
            assertEquals(issued.getPath(), expired.getPath());
            assertNull(issued.getDomain());
            assertEquals(issued.getDomain(), expired.getDomain());
            assertEquals("", expired.getValue());
            assertEquals(0L, expired.getMaxAge());
            assertTrue(issued.getSecure());
            assertTrue(expired.getSecure());
            assertTrue(issued.isHttpOnly());
            assertTrue(expired.isHttpOnly());
            assertTrue(issuedHeader.toLowerCase(Locale.ROOT).contains("samesite=lax"));
            assertTrue(expiredHeader.toLowerCase(Locale.ROOT).contains("samesite=lax"));
        }
    }
}
