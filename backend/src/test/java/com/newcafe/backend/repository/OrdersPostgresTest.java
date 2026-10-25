package com.newcafe.backend.repository;

import static org.junit.jupiter.api.Assertions.*;

import com.newcafe.backend.dto.orders.ChangeOrderStatusRequest;
import com.newcafe.backend.dto.orders.OrderSearchRequest;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.entity.menu.MenuDetails;
import com.newcafe.backend.entity.order.Order;
import com.newcafe.backend.entity.order.OrderItem;
import com.newcafe.backend.service.admin.OrdersService;

import java.sql.DriverManager;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@EnabledIfEnvironmentVariable(named = "ORDER_TEST_DB_URL", matches = "jdbc:postgresql:.*")
@DirtiesContext
class OrdersPostgresTest {
    private static final String SCHEMA = "orders_test_" + UUID.randomUUID().toString().replace("-", "");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) throws Exception {
        try (var connection = DriverManager.getConnection(url(), username(), password());
             var statement = connection.createStatement()) {
            statement.execute("create schema " + SCHEMA);
        }
        registry.add("spring.datasource.url", OrdersPostgresTest::url);
        registry.add("spring.datasource.username", OrdersPostgresTest::username);
        registry.add("spring.datasource.password", OrdersPostgresTest::password);
        registry.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
        registry.add("spring.datasource.hikari.connection-init-sql", () -> "set search_path to " + SCHEMA);
        registry.add("spring.jpa.properties.hibernate.query.fail_on_pagination_over_collection_fetch", () -> true);
    }

    private static String url() { return System.getenv("ORDER_TEST_DB_URL"); }
    private static String username() { return System.getenv().getOrDefault("ORDER_TEST_DB_USERNAME", "postgres"); }
    private static String password() { return System.getenv().getOrDefault("ORDER_TEST_DB_PASSWORD", ""); }

    @AfterAll
    static void cleanup() throws Exception {
        try (var connection = DriverManager.getConnection(url(), username(), password());
             var statement = connection.createStatement()) {
            statement.execute("drop schema if exists " + SCHEMA + " cascade");
        }
    }

    @Autowired OrdersService service;
    @Autowired OrderRepository orders;
    @Autowired MenuRepository menus;
    @Autowired CategoryRepository categories;
    @Autowired PlatformTransactionManager transactions;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void clearFixtures() {
        // 연결은 이 클래스가 생성한 UUID 스키마만 사용한다.
        jdbc.execute("truncate table order_items, orders, menus, categories restart identity cascade");
    }

    private Order seed(String name, String menuName) {
        return new TransactionTemplate(transactions).execute(tx -> {
            Category category = categories.findAll().stream().findFirst()
                    .orElseGet(() -> categories.save(Category.create("테스트", 1)));
            Menu menu = menus.save(Menu.create(category, "test-" + UUID.randomUUID(), new MenuDetails(
                    menuName, "설명", "/images/menus/tea.png", 5000, true, false, false, true, true)));
            return orders.saveAndFlush(Order.create(1L, name, "dine-in", "card", "",
                    List.of(OrderItem.snapshot(menu, "hot", 1), OrderItem.snapshot(menu, "iced", 2))));
        });
    }

    private OrderSearchRequest search(String q, String status, String group, String sort, int page, int size) {
        return new OrderSearchRequest(q, status, group, sort, page, size);
    }

    @Test
    void searchesIdCustomerAndSnapshotWithoutDuplicatingOrdersOrCounts() {
        Order first = seed("Kim", "쌍화차");
        seed("Lee", "커피");
        assertEquals(1, service.list(search("KIM", null, null, null, 0, 20)).totalElements());
        assertEquals(1, service.list(search("쌍화", null, null, null, 0, 20)).totalElements());
        assertEquals(first.getId(), service.list(search(first.getId().toString(), null, null, null, 0, 20)).items().getFirst().id());
        var page = service.list(search(null, null, null, "oldest", 0, 1));
        assertEquals(2, page.totalElements());
        assertEquals(2, page.totalPages());
        assertEquals(first.getId(), page.items().getFirst().id());
        assertEquals(2, page.items().getFirst().items().size());
        assertNotEquals(first.getId(), service.list(search(null, null, null, "oldest", 1, 1)).items().getFirst().id());
        assertEquals(0, service.list(search(null, null, null, "oldest", 2, 1)).items().size());
    }

    @Test
    void filtersGroupsAndTreatsSqlWildcardsLiterally() {
        Order canceled = seed("100%_\\손님", "차");
        seed("다른 손님", "차");
        service.changeStatus(new ChangeOrderStatusRequest(canceled.getId(), "received", 0, "canceled"));
        assertEquals(1, service.list(search("%_\\", null, null, null, 0, 20)).totalElements());
        assertEquals(1, service.list(search(null, "received", "active", null, 0, 20)).totalElements());
        assertEquals(1, service.list(search(null, null, "canceled", null, 0, 20)).totalElements());
        assertEquals(0, service.list(search(null, "received", "canceled", null, 0, 20)).totalElements());
    }

    @Test
    void persistsVersionAndSnapshotsAfterMenuArchive() {
        Order order = seed("손님", "옛 메뉴명");
        var updated = service.changeStatus(new ChangeOrderStatusRequest(order.getId(), "received", 0, "preparing"));
        assertEquals(1, updated.statusVersion());
        assertEquals("preparing", service.get(order.getId()).status());
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            Menu menu = menus.findAll().getFirst();
            menu.update(menu.getCategory(), new MenuDetails("새 메뉴명", "설명", "/images/menus/new.png",
                    9000, true, false, false, true, true));
            menu.archive();
        });
        var stored = service.get(order.getId());
        assertEquals("옛 메뉴명", stored.items().getFirst().menuName());
        assertEquals(15000, stored.totalAmount());
        assertEquals(1, service.list(search("옛 메뉴명", null, null, null, 0, 20)).totalElements());
        assertEquals(0, service.list(search("새 메뉴명", null, null, null, 0, 20)).totalElements());
    }

    @Test
    void simultaneousAdministratorsHaveExactlyOneWinner() throws Exception {
        Long id = seed("손님", "차").getId();
        CyclicBarrier bothRead = new CyclicBarrier(2);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var tasks = List.of("preparing", "canceled").stream().map(next -> pool.submit(() -> {
                try {
                    new TransactionTemplate(transactions).executeWithoutResult(tx -> {
                        orders.findWithItemsById(id).orElseThrow();
                        try { bothRead.await(10, TimeUnit.SECONDS); }
                        catch (Exception error) { throw new IllegalStateException(error); }
                        service.changeStatus(new ChangeOrderStatusRequest(id, "received", 0, next));
                    });
                    return "success";
                } catch (OptimisticLockingFailureException conflict) {
                    return "conflict";
                }
            })).toList();
            List<String> results = List.of(tasks.get(0).get(20, TimeUnit.SECONDS), tasks.get(1).get(20, TimeUnit.SECONDS));
            assertEquals(1, results.stream().filter("success"::equals).count());
            assertEquals(1, results.stream().filter("conflict"::equals).count());
        }
        assertEquals(1, service.get(id).statusVersion());
    }
}
