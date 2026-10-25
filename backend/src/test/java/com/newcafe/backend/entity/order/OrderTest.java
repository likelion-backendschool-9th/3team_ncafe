package com.newcafe.backend.entity.order;

import static org.junit.jupiter.api.Assertions.*;

import com.newcafe.backend.common.error.OrderException;
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
            OrderException error = assertThrows(OrderException.class, () -> order.changeStatus(from, 3, to));
            assertEquals(OrderException.Reason.INVALID_STATUS, error.getReason());
            assertEquals(from, order.getStatus());
        }
    }

    @Test
    void versionDetectsChangeEvenWhenStatusReturnedToOriginalValue() {
        Order order = order();
        ReflectionTestUtils.setField(order, "statusVersion", 2);
        OrderException error = assertThrows(OrderException.class,
                () -> order.changeStatus("received", 0, "preparing"));
        assertEquals(OrderException.Reason.STALE_STATUS, error.getReason());
        assertEquals("received", order.getStatus());
        assertThrows(OrderException.class, () -> order.changeStatus("ready", 2, "preparing"));
    }

    @Test
    void snapshotsAndTotalsSurviveMenuChangesAndArchival() {
        Menu menu = menu();
        Order order = Order.create(1L, "손님", "dine-in", "card", "덜 뜨겁게", List.of(OrderItem.snapshot(menu, "hot", 2)));
        menu.update(menu.getCategory(), new MenuDetails("바뀐 이름", "설명", "/images/menus/new.png",
                9000, true, false, false, true, true));
        menu.archive();
        assertEquals("커피", order.getItems().getFirst().getMenuName());
        assertEquals(4000, order.getItems().getFirst().getUnitPrice());
        assertEquals(8000, order.getTotalAmount());
        assertEquals("/images/menus/coffee.png", order.getItems().getFirst().getImageUrl());
        assertThrows(UnsupportedOperationException.class, () -> order.getItems().clear());
        assertThrows(IllegalArgumentException.class, () -> Order.create(2L, "다른 손님", "takeout", "cash", "", order.getItems()));
    }

    @Test
    void rejectsInvalidOptionsAndEmptyOrders() {
        assertThrows(IllegalArgumentException.class, () -> OrderItem.snapshot(menu(), "ice", 1));
        assertThrows(IllegalArgumentException.class, () -> OrderItem.snapshot(menu(), null, 1));
        assertThrows(IllegalArgumentException.class, () -> OrderItem.snapshot(menu(), "hot", 21));
        assertThrows(IllegalArgumentException.class, () -> Order.create(1L, "손님", "takeout", "cash", "", List.of()));
        assertThrows(IllegalArgumentException.class, () -> Order.create(1L, "손님", null, "cash", "", List.of(OrderItem.snapshot(menu(), "hot", 1))));
    }

    public static Order order() {
        return Order.create(1L, "손님", "takeout", "cash", "", List.of(OrderItem.snapshot(menu(), "hot", 1)));
    }

    public static Menu menu() {
        return Menu.create(Category.create("커피", 1), "coffee", new MenuDetails("커피", "설명",
                "/images/menus/coffee.png", 4000, true, false, false, true, true));
    }
}
