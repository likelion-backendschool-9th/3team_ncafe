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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

// 실제 PostgreSQL·세션 로그인·CSRF로 장바구니 API를 확인한다 (계획 S1~S17).
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.config.import=",
        "spring.sql.init.mode=never",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.security.allowed-origins=http://localhost:3000"
})
@Import(BackendDatabaseIntegrationTest.DatabaseConfiguration.class)
@Tag("integration")
class CartItemsIntegrationTest {

    private static final String PASSWORD = "비밀번호123!";
    private static final String CART_ITEMS = "/api/v1/cart/items";
    // 카테고리 표시 순서는 겹칠 수 없어 다른 테스트와 겹치지 않는 큰 값부터 쓴다.
    private static final AtomicInteger NEXT_DISPLAY_ORDER = new AtomicInteger(1000);

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
    void customerAddsMergesReadsChangesAndRemovesOwnLines() throws Exception {
        Menu coffee = menu("커피", 3500, true, true, true);
        Menu monaka = menu("모나카", 3000, true, false, false);
        Menu soldOut = menu("생칡즙", 6000, false, false, true);

        try (Browser owner = signIn(createMember()); Browser other = signIn(createMember())) {
            JsonNode coffeeLine = assertJson(owner.send("POST", CART_ITEMS, add(coffee.getId(), "iced", 2)), 201);
            assertEquals(coffee.getId(), coffeeLine.get("menuId").asLong());
            assertEquals(7000, coffeeLine.get("lineTotal").asInt());
            long coffeeLineId = coffeeLine.get("id").asLong();

            JsonNode merged = assertJson(owner.send("POST", CART_ITEMS, add(coffee.getId(), "iced", 19)), 200);
            assertEquals(coffeeLineId, merged.get("id").asLong());
            assertEquals(20, merged.get("quantity").asInt());

            long monakaLineId = assertJson(owner.send("POST", CART_ITEMS, add(monaka.getId(), null, 1)), 201).get("id").asLong();
            JsonNode mergedNull = assertJson(owner.send("POST", CART_ITEMS, add(monaka.getId(), null, 1)), 200);
            assertEquals(monakaLineId, mergedNull.get("id").asLong());
            assertEquals(2, mergedNull.get("quantity").asInt());

            assertError(owner.send("POST", CART_ITEMS, add(soldOut.getId(), "iced", 1)), 422, "MENU_UNAVAILABLE");
            assertError(owner.send("POST", CART_ITEMS, add(coffee.getId(), null, 1)), 400, "INVALID_INPUT");
            assertError(owner.send("POST", CART_ITEMS, add(999999L, "iced", 1)), 404, "NOT_FOUND");
            assertError(owner.send("POST", CART_ITEMS, add(coffee.getId(), "iced", 21)), 400, "VALIDATION_ERROR");

            HttpResponse<String> listResponse = owner.send("GET", "/api/v1/cart/items", null);
            assertNoStore(listResponse);
            JsonNode cart = assertJson(listResponse, 200);
            assertEquals(List.of(coffeeLineId, monakaLineId), ids(cart));
            assertEquals(22, cart.get("totalQuantity").asInt());
            assertEquals(20 * 3500 + 2 * 3000, cart.get("totalAmount").asLong());

            JsonNode changed = assertJson(owner.send("PUT", linePath(coffeeLineId), "{\"quantity\":5}"), 200);
            assertEquals(5, changed.get("quantity").asInt());
            assertError(owner.send("PUT", linePath(coffeeLineId), "{\"quantity\":0}"), 400, "VALIDATION_ERROR");

            // 가격·판매 여부는 담은 때가 아니라 지금 메뉴에서 읽는다.
            jdbcTemplate.update("update menus set price = 4000 where id = ?", coffee.getId());
            jdbcTemplate.update("update menus set available = false where id = ?", monaka.getId());
            cart = assertJson(owner.send("GET", "/api/v1/cart/items", null), 200);
            assertEquals(4000, cart.get("items").get(0).get("unitPrice").asInt());
            assertFalse(cart.get("items").get(1).get("orderable").asBoolean());
            assertEquals(5 * 4000, cart.get("totalAmount").asLong());

            assertTrue(assertJson(other.send("GET", "/api/v1/cart/items", null), 200).get("items").isEmpty());
            assertError(other.send("PUT", linePath(coffeeLineId), "{\"quantity\":1}"), 404, "NOT_FOUND");
            assertError(other.send("DELETE", linePath(coffeeLineId), null), 404, "NOT_FOUND");

            assertEquals(204, owner.send("DELETE", linePath(coffeeLineId), null).statusCode());
            assertEquals(List.of(monakaLineId), ids(assertJson(owner.send("GET", "/api/v1/cart/items", null), 200)));
        }
    }

    @Test
    void concurrentAddsOfMenuWithoutTemperatureKeepOneLine() throws Exception {
        Menu monaka = menu("모나카", 3000, true, false, false);
        String email = createMember();

        try (Browser owner = signIn(email)) {
            List<CompletableFuture<HttpResponse<String>>> requests = new ArrayList<>();
            for (int i = 0; i < 8; i++) {
                requests.add(owner.sendAsync("POST", CART_ITEMS, add(monaka.getId(), null, 1)));
            }
            for (CompletableFuture<HttpResponse<String>> request : requests) {
                assertTrue(List.of(200, 201).contains(request.join().statusCode()));
            }

            Long memberId = userRepository.findByEmail(email).orElseThrow().getId();
            assertEquals(1, jdbcTemplate.queryForObject(
                    "select count(*) from cart_items where user_id = ? and menu_id = ?", Integer.class,
                    memberId, monaka.getId()));
            assertEquals(8, jdbcTemplate.queryForObject(
                    "select quantity from cart_items where user_id = ? and menu_id = ?", Integer.class,
                    memberId, monaka.getId()));
        }
    }

    @Test
    void anonymousAdministratorAndMissingCsrfAreRejected() throws Exception {
        Menu coffee = menu("커피", 3500, true, true, true);
        String adminEmail = createMember();
        jdbcTemplate.update("update users set role = 'admin' where email = ?", adminEmail);

        try (Browser anonymous = browser(); Browser admin = signIn(adminEmail); Browser customer = signIn(createMember())) {
            assertError(anonymous.send("POST", CART_ITEMS, add(coffee.getId(), "iced", 1)), 401, "UNAUTHENTICATED");
            assertError(anonymous.send("GET", "/api/v1/cart/items", null), 401, "UNAUTHENTICATED");
            assertError(admin.send("POST", CART_ITEMS, add(coffee.getId(), "iced", 1)), 403, "FORBIDDEN");
            assertError(admin.send("GET", "/api/v1/cart/items", null), 403, "FORBIDDEN");
            assertError(customer.sendWithoutCsrf("POST", CART_ITEMS, add(coffee.getId(), "iced", 1)), 403, "CSRF_INVALID");
            assertEquals(200, customer.sendWithoutCsrf("GET", "/api/v1/cart/items", null).statusCode());
        }
    }

    private Menu menu(String name, int price, boolean available, boolean hot, boolean iced) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Category category = categoryRepository.saveAndFlush(
                Category.create("장바구니-" + suffix, NEXT_DISPLAY_ORDER.getAndIncrement()));
        return menuRepository.saveAndFlush(Menu.create(category, "cart-test-" + suffix, new MenuDetails(
                name, name + " 설명", "/images/menus/coffee.jpg", price, available, false, false, hot, iced)));
    }

    private String createMember() {
        String email = "cart-test-" + UUID.randomUUID() + "@example.com";
        userRepository.saveAndFlush(User.createCustomer("장바구니 테스트 회원", email, passwords.encode(PASSWORD)));
        return email;
    }

    private Browser signIn(String email) throws Exception {
        Browser browser = browser();
        String body = "email=" + URLEncoder.encode(email, StandardCharsets.UTF_8)
                + "&password=" + URLEncoder.encode(PASSWORD, StandardCharsets.UTF_8);
        HttpResponse<String> login = browser.client().send(request("/api/v1/auth/login")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header(browser.csrf().headerName(), browser.csrf().token())
                .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, login.statusCode(), login.body());
        // 로그인하면 CSRF 토큰이 바뀌므로 다시 받는다.
        return new Browser(this, browser.client(), csrf(browser.client()));
    }

    private Browser browser() throws Exception {
        HttpClient client = HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .followRedirects(HttpClient.Redirect.NEVER).connectTimeout(Duration.ofSeconds(10)).build();
        return new Browser(this, client, csrf(client));
    }

    private Csrf csrf(HttpClient client) throws Exception {
        HttpResponse<String> response = client.send(request("/api/v1/auth/csrf").GET().build(),
                HttpResponse.BodyHandlers.ofString());
        JsonNode csrf = assertJson(response, 200);
        return new Csrf(csrf.get("headerName").asText(), csrf.get("token").asText());
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).timeout(Duration.ofSeconds(15));
    }

    private String add(Long menuId, String temperature, int quantity) {
        Map<String, Object> body = new HashMap<>();
        body.put("menuId", menuId);
        body.put("temperature", temperature);
        body.put("quantity", quantity);
        return jsonMapper.writeValueAsString(body);
    }

    private static String linePath(long id) {
        return "/api/v1/cart/items/" + id;
    }

    private static List<Long> ids(JsonNode cart) {
        List<Long> ids = new ArrayList<>();
        cart.get("items").forEach(item -> ids.add(item.get("id").asLong()));
        return ids;
    }

    private JsonNode assertJson(HttpResponse<String> response, int status) {
        assertEquals(status, response.statusCode(), response.body());
        return jsonMapper.readTree(response.body());
    }

    private void assertError(HttpResponse<String> response, int status, String code) {
        assertEquals(code, assertJson(response, status).get("code").asText());
    }

    private static void assertNoStore(HttpResponse<String> response) {
        assertTrue(response.headers().firstValue("Cache-Control").orElseThrow().contains("no-store"));
    }

    private record Csrf(String headerName, String token) {
    }

    private record Browser(CartItemsIntegrationTest test, HttpClient client, Csrf csrf) implements AutoCloseable {

        HttpResponse<String> send(String method, String path, String body) throws Exception {
            return client.send(build(method, path, body, true), HttpResponse.BodyHandlers.ofString());
        }

        HttpResponse<String> sendWithoutCsrf(String method, String path, String body) throws Exception {
            return client.send(build(method, path, body, false), HttpResponse.BodyHandlers.ofString());
        }

        CompletableFuture<HttpResponse<String>> sendAsync(String method, String path, String body) {
            return client.sendAsync(build(method, path, body, true), HttpResponse.BodyHandlers.ofString());
        }

        private HttpRequest build(String method, String path, String body, boolean withCsrf) {
            HttpRequest.Builder builder = test.request(path).header("Content-Type", "application/json")
                    .method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                            : HttpRequest.BodyPublishers.ofString(body));
            if (withCsrf) {
                builder.header(csrf.headerName(), csrf.token());
            }
            return builder.build();
        }

        @Override
        public void close() {
            client.close();
        }
    }
}
