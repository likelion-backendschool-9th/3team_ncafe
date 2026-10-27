package com.newcafe.backend.entity.order;

import static org.junit.jupiter.api.Assertions.*;

import com.newcafe.backend.common.error.AdminOrderException;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.entity.menu.MenuDetails;
import com.newcafe.backend.dto.orders.AdminOrderResponse;
import com.newcafe.backend.dto.orders.OrderResponse;

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
            order.changeStatus(from, 3, to, "canceled".equals(to) ? "재료 소진" : null);
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
        assertNull(order.getCancelReason());
        assertEquals(4000, order.getTotalAmount());
        assertSame(order, order.getItems().getFirst().getOrder());
    }

    static Stream<String> invalidReasons() {
        return Stream.of(null, "", "\0", " \t\r\n ", "\u00a0\u2003\ufeff", "가".repeat(201), "😀".repeat(101));
    }

    @ParameterizedTest
    @MethodSource("invalidReasons")
    void invalidCancellationReasonCannotMutateAnyOrderFields(String reason) {
        Order order = order();
        ReflectionTestUtils.invokeMethod(order, "onCreate");
        var updatedAt = order.getUpdatedAt();
        var error = assertThrows(AdminOrderException.class,
                () -> order.changeStatus("received", 0, "canceled", reason));
        assertEquals(AdminOrderException.Reason.INVALID_INPUT, error.getReason());
        assertEquals("received", order.getStatus());
        assertEquals(0, order.getStatusVersion());
        assertEquals(updatedAt, order.getUpdatedAt());
        assertNull(order.getCancelReason());
    }

    @Test
    void cancellationPersistsNormalizedReasonInBothResponseContractsAndCannotBeEdited() {
        Order order = order();
        order.changeStatus("received", 0, "canceled", "\u00a0 재료 소진\r\n다음에 이용해 주세요. \ufeff");
        String reason = "재료 소진\n다음에 이용해 주세요.";
        assertEquals(reason, order.getCancelReason());
        assertEquals(reason, AdminOrderResponse.from(order).cancelReason());
        assertEquals(reason, OrderResponse.from(order).cancelReason());
        assertThrows(AdminOrderException.class, () -> order.changeStatus("canceled", 0, "received"));
        assertThrows(AdminOrderException.class, () -> order.changeStatus("canceled", 0, "canceled", "다른 사유"));
        assertEquals(reason, order.getCancelReason());
    }

    @Test
    void acceptsBoundaryLengthsAndRejectsReasonOnOtherTransitions() {
        for (String reason : List.of("가", "가".repeat(200), "😀".repeat(100))) {
            Order order = order();
            order.changeStatus("received", 0, "canceled", reason);
            assertEquals(reason, order.getCancelReason());
        }
        Order order = order();
        assertThrows(AdminOrderException.class, () -> order.changeStatus("received", 0, "preparing", "재료 소진"));
        assertEquals("received", order.getStatus());
        order.changeStatus("received", 0, "preparing", " \n ");
        assertNull(order.getCancelReason());
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
