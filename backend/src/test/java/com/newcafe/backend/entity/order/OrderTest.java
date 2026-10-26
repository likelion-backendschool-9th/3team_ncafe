package com.newcafe.backend.entity.order;

import static org.junit.jupiter.api.Assertions.*;

import com.newcafe.backend.common.error.AdminOrderException;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.entity.menu.MenuDetails;

import java.util.List;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.test.util.ReflectionTestUtils;

class OrderTest {
    static Stream<Arguments> transitions() {
        List<String> statuses = List.of("received", "preparing", "ready", "completed", "canceled");
        List<String> allowed = List.of("received:preparing", "received:canceled", "preparing:received",
                "preparing:ready", "ready:preparing", "ready:completed", "completed:ready");
        return statuses.stream().flatMap(from -> statuses.stream()
                .map(to -> Arguments.of(from, to, allowed.contains(from + ":" + to))));
    }

    @ParameterizedTest
    @MethodSource("transitions")
    void onlyAdjacentChangesAndReceivedCancellationAreAllowed(String from, String to, boolean allowed) {
        Order order = order();
        ReflectionTestUtils.setField(order, "status", from);
        ReflectionTestUtils.setField(order, "statusVersion", 3);
        if (allowed) {
            order.changeStatus(from, 3, to);
            assertEquals(to, order.getStatus());
        } else {
            AdminOrderException error = assertThrows(AdminOrderException.class, () -> order.changeStatus(from, 3, to));
            assertEquals(AdminOrderException.Reason.INVALID_STATUS, error.getReason());
            assertEquals(from, order.getStatus());
        }
    }

    @Test
    void versionDetectsChangeEvenWhenStatusReturnedToOriginalValue() {
        Order order = order();
        ReflectionTestUtils.setField(order, "statusVersion", 2);
        AdminOrderException error = assertThrows(AdminOrderException.class,
                () -> order.changeStatus("received", 0, "preparing"));
        assertEquals(AdminOrderException.Reason.STALE_STATUS, error.getReason());
        assertEquals("received", order.getStatus());
        assertThrows(AdminOrderException.class, () -> order.changeStatus("ready", 2, "preparing"));
    }

    @Test
    void snapshotsAndTotalsSurviveMenuChangesAndArchival() {
        Menu menu = menu();
        Order order = Order.create(1L, "손님", "dine-in", "card", "덜 뜨겁게", 8000, "snapshot-test", "fingerprint");
        order.addItem(OrderItem.snapshot(menu, "hot", 2, 4000, 8000));
        menu.update(menu.getCategory(), new MenuDetails("바뀐 이름", "설명", "/images/menus/new.png",
                9000, true, false, false, true, true));
        menu.archive();
        assertEquals("커피", order.getItems().getFirst().getMenuName());
        assertEquals(4000, order.getItems().getFirst().getUnitPrice());
        assertEquals(8000, order.getTotalAmount());
        assertEquals("/images/menus/coffee.png", order.getItems().getFirst().getImageUrl());
        assertThrows(UnsupportedOperationException.class, () -> order.getItems().clear());
        assertThrows(IllegalArgumentException.class, () -> order().addItem(order.getItems().getFirst()));
        ReflectionTestUtils.setField(order, "id", 10L);
        assertThrows(IllegalStateException.class,
                () -> order.addItem(OrderItem.snapshot(menu(), "hot", 1, 4000, 4000)));
    }

    @Test
    void rejectsInvalidSnapshotOptionsAndAmounts() {
        assertThrows(IllegalArgumentException.class, () -> OrderItem.snapshot(menu(), "ice", 1, 4000, 4000));
        assertThrows(IllegalArgumentException.class, () -> OrderItem.snapshot(menu(), null, 1, 4000, 4000));
        assertThrows(IllegalArgumentException.class, () -> OrderItem.snapshot(menu(), "hot", 21, 4000, 84000));
        assertThrows(IllegalArgumentException.class, () -> OrderItem.snapshot(menu(), "hot", 1, 4000, 5000));
    }

    @Test
    void preservesCustomerOrderCreationAndIdempotencyContract() {
        Order order = Order.create(7L, "고객", "takeout", "cash", null, 4000, "request-1", "fingerprint");
        order.addItem(OrderItem.snapshot(menu(), "hot", 1, 4000, 4000));
        assertEquals(Order.RECEIVED, order.getStatus());
        assertEquals(0, order.getStatusVersion());
        assertEquals("request-1", order.getIdempotencyKey());
        assertEquals("fingerprint", order.getRequestFingerprint());
        assertNull(order.getRequest());
        assertEquals(4000, order.getTotalAmount());
        assertSame(order, order.getItems().getFirst().getOrder());
    }

    private static Order order() {
        Order order = Order.create(1L, "손님", "takeout", "cash", null, 4000, "test-key", "fingerprint");
        order.addItem(OrderItem.snapshot(menu(), "hot", 1, 4000, 4000));
        return order;
    }

    private static Menu menu() {
        return Menu.create(Category.create("커피", 1), "coffee", new MenuDetails("커피", "설명",
                "/images/menus/coffee.png", 4000, true, false, false, true, true));
    }
}
