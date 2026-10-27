package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.*;

import com.newcafe.backend.dto.orders.ChangeOrderStatusRequest;
import com.newcafe.backend.dto.orders.OrderSearchRequest;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.entity.menu.MenuDetails;
import com.newcafe.backend.entity.order.Order;
import com.newcafe.backend.entity.order.OrderItem;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.repository.OrderRepository;
import com.newcafe.backend.service.admin.OrdersService;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

// 관리자 주문 검색 쿼리(LIKE·서브쿼리)와 낙관적 잠금을 실제 PostgreSQL로 확인한다.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK, properties = {
        "spring.config.import=",
        "spring.sql.init.mode=never",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.query.fail_on_pagination_over_collection_fetch=true"
})
@Import(BackendDatabaseIntegrationTest.DatabaseConfiguration.class)
@DirtiesContext
@Tag("integration")
class AdminOrdersIntegrationTest {

    @Autowired OrdersService service;
    @Autowired OrderRepository orders;
    @Autowired MenuRepository menus;
    @Autowired CategoryRepository categories;
    @Autowired PlatformTransactionManager transactions;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void clearFixtures() {
        jdbc.execute("truncate table order_items, orders, menus, categories restart identity cascade");
    }

    private Order seed(String name, String menuName) {
        return new TransactionTemplate(transactions).execute(tx -> {
            Category category = categories.findAll().stream().findFirst()
                    .orElseGet(() -> categories.save(Category.create("테스트", 1)));
            Menu menu = menus.save(Menu.create(category, "test-" + UUID.randomUUID(), new MenuDetails(
                    menuName, "설명", "/images/menus/tea.png", 5000, true, false, false, true, true)));
            Order order = Order.create(1L, name, "dine-in", "card", null, 15000,
                    "admin-test-" + UUID.randomUUID(), "test-fingerprint");
            order.addItem(OrderItem.snapshot(menu, "hot", 1, 5000, 5000));
            order.addItem(OrderItem.snapshot(menu, "iced", 2, 5000, 10000));
            return orders.saveAndFlush(order);
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
