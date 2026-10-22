package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

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
}
