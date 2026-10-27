package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.newcafe.backend.common.security.Passwords;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.entity.menu.MenuDetails;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
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
@Tag("integration")
class AdminSessionIntegrationTest {

    private static final String CATEGORIES = "/api/v1/admin/categories";
    private static final String MENUS = "/api/v1/admin/menus";
    private static final String PASSWORD = " admin-session123! ";

    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private MenuRepository menuRepository;

    @Autowired
    private Passwords passwords;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void publicSignupCustomerLoginMyAndLogoutUseTheSameRealCookieSession() throws Exception {
        String email = "signup-" + unique() + "@example.com";
        try (Browser browser = new Browser()) {
            JsonNode signup = assertJson(browser.json("POST", "/api/v1/auth/signup", Map.of(
                    "name", "단골 고객", "email", email, "password", PASSWORD, "passwordConfirm", PASSWORD)), 201);
            assertEquals("customer", signup.get("role").asText());
            assertError(browser.get("/api/v1/my"), 401, "UNAUTHENTICATED");

            browser.login(email);
            JsonNode current = assertJson(browser.get("/api/v1/my"), 200);
            assertEquals(signup.get("id").asLong(), current.get("id").asLong());
            assertEquals(email, current.get("email").asText());
            assertEquals("customer", current.get("role").asText());
            assertFalse(current.has("password"));
            assertFalse(current.has("passwordHash"));

            assertEquals(204, browser.json("POST", "/api/v1/auth/logout", null).statusCode());
            assertError(browser.get("/api/v1/my"), 401, "UNAUTHENTICATED");
        }
    }

    @Test
    void administratorCanManageCategoriesAndMenusThroughAuthenticatedHttpRequests() throws Exception {
        try (Browser admin = new Browser()) {
            admin.login(createMember(true));
            assertEquals("admin", assertJson(admin.get("/api/v1/my"), 200).get("role").asText());
            String suffix = unique();
            HttpResponse<String> createdCategory = admin.json("POST", CATEGORIES, Map.of("name", "커피-" + suffix));
            long coffee = assertJson(createdCategory, 201).get("id").asLong();
            assertEquals(CATEGORIES + "/" + coffee, createdCategory.headers().firstValue("Location").orElseThrow());
            long dessert = assertJson(admin.json("POST", CATEGORIES, Map.of("name", "다과-" + suffix)), 201)
                    .get("id").asLong();
            String renamed = "새 다과-" + suffix;
            assertEquals(renamed, assertJson(admin.json("PUT", CATEGORIES + "/" + dessert,
                    Map.of("name", renamed)), 200).get("name").asText());

            JsonNode listed = assertJson(admin.get(CATEGORIES), 200);
            List<Long> order = new ArrayList<>();
            listed.forEach(category -> order.add(category.get("id").asLong()));
            Collections.reverse(order);
            JsonNode reordered = assertJson(admin.json("PUT", CATEGORIES + "/order",
                    Map.of("orderedIds", order)), 200);
            for (int i = 0; i < order.size(); i++) {
                assertEquals(order.get(i).longValue(), reordered.get(i).get("id").asLong());
                assertEquals(i + 1, reordered.get(i).get("displayOrder").asInt());
            }

            String slug = "admin-" + suffix;
            Map<String, Object> menuBody = menuBody(coffee, slug);
            HttpResponse<String> createdMenu = admin.json("POST", MENUS, menuBody);
            long menuId = assertJson(createdMenu, 201).get("id").asLong();
            assertEquals(MENUS + "/" + menuId, createdMenu.headers().firstValue("Location").orElseThrow());
            assertEquals(coffee, assertJson(admin.get(MENUS + "/" + menuId), 200).get("categoryId").asLong());
            JsonNode page = assertJson(admin.get(MENUS + "?q=" + slug), 200);
            assertEquals(1, page.get("items").size());
            assertEquals(menuId, page.get("items").get(0).get("id").asLong());

            menuBody.remove("slug");
            menuBody.put("categoryId", dessert);
            menuBody.put("price", 5500);
            menuBody.put("available", false);
            JsonNode updated = assertJson(admin.json("PUT", MENUS + "/" + menuId, menuBody), 200);
            assertEquals(renamed, updated.get("categoryName").asText());
            assertEquals(5500, updated.get("price").asInt());
            assertFalse(updated.get("available").asBoolean());
            assertEquals(slug, updated.get("slug").asText());

            assertEquals(204, admin.json("DELETE", CATEGORIES + "/" + dessert, null).statusCode());
            JsonNode moved = assertJson(admin.get(MENUS + "/" + menuId), 200);
            assertEquals(categoryRepository.findFallback().orElseThrow().getId().longValue(),
                    moved.get("categoryId").asLong());
            assertEquals(Category.FALLBACK_NAME, moved.get("categoryName").asText());
            assertFalse(categoryRepository.existsById(dessert));

            assertEquals(204, admin.json("DELETE", MENUS + "/" + menuId, null).statusCode());
            assertError(admin.get(MENUS + "/" + menuId), 404, "NOT_FOUND");
            assertEquals(0, assertJson(admin.get(MENUS + "?q=" + slug), 200).get("items").size());
            assertEquals(1, jdbcTemplate.queryForObject(
                    "select count(*) from menus where id = ? and archived_at is not null and available = false",
                    Integer.class, menuId));
            assertEquals(204, admin.json("DELETE", CATEGORIES + "/" + coffee, null).statusCode());
        }
    }

    @Test
    void anonymousAndCustomerRequestsCannotReadOrChangeEitherAdminResource() throws Exception {
        Category fallback = categoryRepository.findFallback().orElseThrow();
        String slug = "protected-" + unique();
        Menu fixture = menuRepository.saveAndFlush(Menu.create(fallback, slug, new MenuDetails(
                "보호 메뉴", "진한 커피", "/images/menus/coffee.png", 4500, true, false, false, true, true)));
        long categoriesBefore = categoryRepository.count();
        long menusBefore = menuRepository.count();
        try (Browser customer = new Browser()) {
            assertError(customer.get(CATEGORIES), 401, "UNAUTHENTICATED");
            assertError(customer.get(MENUS), 401, "UNAUTHENTICATED");
            customer.login(createMember(false));
            assertError(customer.get(CATEGORIES), 403, "FORBIDDEN");
            assertError(customer.get(MENUS), 403, "FORBIDDEN");
            assertError(customer.json("POST", CATEGORIES, Map.of("name", "차단-" + unique())), 403, "FORBIDDEN");
            assertError(customer.json("POST", MENUS, menuBody(fallback.getId(), "denied-" + unique())),
                    403, "FORBIDDEN");
            assertError(customer.json("PUT", CATEGORIES + "/" + fallback.getId(), Map.of("name", "변경 시도")),
                    403, "FORBIDDEN");
            Map<String, Object> update = menuBody(fallback.getId(), slug);
            update.remove("slug");
            update.put("price", 9999);
            assertError(customer.json("PUT", MENUS + "/" + fixture.getId(), update), 403, "FORBIDDEN");

            assertEquals(categoriesBefore, categoryRepository.count());
            assertEquals(menusBefore, menuRepository.count());
            assertEquals(Category.FALLBACK_NAME, categoryRepository.findById(fallback.getId()).orElseThrow().getName());
            assertEquals(4500, menuRepository.findById(fixture.getId()).orElseThrow().getPrice());
        }
    }

    @Test
    void adminMissingCsrfCannotWriteAndValidCsrfStillReceivesBusinessErrors() throws Exception {
        try (Browser admin = new Browser()) {
            admin.login(createMember(true));
            long categoriesBefore = categoryRepository.count();
            long menusBefore = menuRepository.count();
            String name = "검증-" + unique();
            assertError(admin.json("POST", CATEGORIES, Map.of("name", name), false), 403, "CSRF_INVALID");
            assertError(admin.json("POST", MENUS,
                    menuBody(categoryRepository.findFallback().orElseThrow().getId(), "csrf-" + unique()), false),
                    403, "CSRF_INVALID");
            assertEquals(categoriesBefore, categoryRepository.count());
            assertEquals(menusBefore, menuRepository.count());

            assertError(admin.json("POST", CATEGORIES, Map.of("name", "   ")), 400, "VALIDATION_ERROR");
            long created = assertJson(admin.json("POST", CATEGORIES, Map.of("name", name)), 201).get("id").asLong();
            assertError(admin.json("POST", CATEGORIES, Map.of("name", name)), 409, "CONFLICT");
            assertEquals(categoriesBefore + 1, categoryRepository.count());
            assertEquals(204, admin.json("DELETE", CATEGORIES + "/" + created, null).statusCode());
        }
    }

    private String createMember(boolean administrator) {
        String email = "admin-test-" + unique() + "@example.com";
        userRepository.saveAndFlush(User.createCustomer("검증 회원", email, passwords.encode(PASSWORD)));
        if (administrator) {
            jdbcTemplate.update("update users set role = 'admin' where email = ?", email);
        }
        return email;
    }

    private Map<String, Object> menuBody(long categoryId, String slug) {
        Map<String, Object> body = new HashMap<>(Map.of("categoryId", categoryId, "name", "검증 메뉴 " + slug,
                "description", "진한 커피", "imageUrl", "/images/menus/coffee.png", "price", 4500,
                "available", true, "isNew", false, "recommended", true, "supportsHot", true, "supportsIced", true));
        body.put("slug", slug);
        return body;
    }

    private JsonNode assertJson(HttpResponse<String> response, int status) {
        assertEquals(status, response.statusCode(), response.body());
        assertTrue(response.headers().firstValue("Content-Type").orElseThrow().contains("application/json"));
        assertTrue(response.headers().firstValue("Location").isEmpty() || status == 201);
        return jsonMapper.readTree(response.body());
    }

    private void assertError(HttpResponse<String> response, int status, String code) {
        assertEquals(code, assertJson(response, status).get("code").asText());
    }

    private String unique() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private record Csrf(String headerName, String token) {
    }

    private final class Browser implements AutoCloseable {
        private final HttpClient client = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .followRedirects(HttpClient.Redirect.NEVER).connectTimeout(Duration.ofSeconds(10)).build();
        private Csrf csrf;

        private Browser() throws Exception {
            refreshCsrf();
        }

        private void login(String email) throws Exception {
            String form = "email=" + URLEncoder.encode(email, StandardCharsets.UTF_8)
                    + "&password=" + URLEncoder.encode(PASSWORD, StandardCharsets.UTF_8);
            HttpResponse<String> response = client.send(request("/api/v1/auth/login")
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .header(csrf.headerName(), csrf.token()).POST(HttpRequest.BodyPublishers.ofString(form)).build(),
                    HttpResponse.BodyHandlers.ofString());
            assertJson(response, 200);
            refreshCsrf();
        }

        private void refreshCsrf() throws Exception {
            JsonNode issued = assertJson(get("/api/v1/auth/csrf"), 200);
            csrf = new Csrf(issued.get("headerName").asText(), issued.get("token").asText());
        }

        private HttpResponse<String> get(String path) throws Exception {
            return client.send(request(path).GET().build(), HttpResponse.BodyHandlers.ofString());
        }

        private HttpResponse<String> json(String method, String path, Object body) throws Exception {
            return json(method, path, body, true);
        }

        private HttpResponse<String> json(String method, String path, Object body, boolean includeCsrf) throws Exception {
            HttpRequest.Builder request = request(path).header("Content-Type", "application/json");
            if (includeCsrf) {
                request.header(csrf.headerName(), csrf.token());
            }
            return client.send(request.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(jsonMapper.writeValueAsString(body))).build(),
                    HttpResponse.BodyHandlers.ofString());
        }

        private HttpRequest.Builder request(String path) {
            return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                    .timeout(Duration.ofSeconds(15));
        }

        @Override
        public void close() {
            client.close();
        }
    }
}
