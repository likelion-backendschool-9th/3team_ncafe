package com.newcafe.backend.service.my;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import com.newcafe.backend.common.error.OrderException;
import com.newcafe.backend.dto.orders.CreateOrderRequest;
import com.newcafe.backend.entity.cartitem.CartItem;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.entity.order.Order;
import com.newcafe.backend.repository.CartItemRepository;
import com.newcafe.backend.repository.OrderMenuRepository;
import com.newcafe.backend.repository.OrderRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OrdersServiceTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private CartItemRepository cartItemRepository;
    @Mock
    private OrderMenuRepository menuRepository;
    private OrdersService service;

    @BeforeEach
    void setUp() {
        service = new OrdersService(orderRepository, cartItemRepository, menuRepository);
    }

    @Test
    void createPricesFromCurrentMenuAndRemovesOnlySelectedCartItems() {
        CartItem first = cartItem(11L, 3, "iced");
        CartItem second = cartItem(12L, 1, "hot");
        Menu icedMenu = menu(21L, "라떼", 4500, true, true, true);
        Menu hotMenu = menu(22L, "아메리카노", 3000, true, true, true);
        when(orderRepository.findByCustomerIdAndIdempotencyKey(7L, "request-1")).thenReturn(Optional.empty());
        when(cartItemRepository.findOwnedForUpdate(7L, List.of(11L, 12L))).thenReturn(List.of(first, second));
        when(menuRepository.findAllForOrderUpdate(List.of(21L, 22L))).thenReturn(List.of(icedMenu, hotMenu));
        when(orderRepository.saveAndFlush(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.create(7L, "손님", "request-1",
                new CreateOrderRequest(List.of(12L, 11L), "dine-in", "card", "시럽 빼 주세요", 16500));

        assertEquals(16500, response.totalAmount());
        assertEquals("received", response.status());
        assertEquals(2, response.items().size());
        assertEquals(13500, response.items().get(0).lineTotal());
        assertEquals(3000, response.items().get(1).lineTotal());
        assertEquals("라떼", response.items().get(0).menuName());
        assertEquals("/images/menus/latte.svg", response.items().get(0).imageUrl());
        verify(cartItemRepository).deleteAllByIdInBatch(List.of(11L, 12L));
    }

    @Test
    void rejectsClientAmountMismatchWithoutSavingOrDeletingCart() {
        CartItem item = cartItem(11L, 2, null);
        Menu menu = menu(21L, "쿠키", 2000, false, false, true);
        when(orderRepository.findByCustomerIdAndIdempotencyKey(7L, "request-2")).thenReturn(Optional.empty());
        when(cartItemRepository.findOwnedForUpdate(7L, List.of(11L))).thenReturn(List.of(item));
        when(menuRepository.findAllForOrderUpdate(List.of(21L))).thenReturn(List.of(menu));

        assertThrows(OrderException.class, () -> service.create(7L, "손님", "request-2",
                new CreateOrderRequest(List.of(11L), "takeout", "cash", null, 3000)));

        verify(orderRepository, never()).saveAndFlush(any());
        verify(cartItemRepository, never()).deleteAllByIdInBatch(anyCollection());
    }

    @Test
    void returnsExistingOrderForSameIdempotencyKeyAndPayload() {
        CartItem item = cartItem(11L, 1, null);
        Menu menu = menu(21L, "쿠키", 2000, false, false, true);
        CreateOrderRequest request = new CreateOrderRequest(List.of(11L), "takeout", "cash", null, 2000);
        when(orderRepository.findByCustomerIdAndIdempotencyKey(7L, "repeat")).thenReturn(Optional.empty(), Optional.of(savedOrder()));
        when(cartItemRepository.findOwnedForUpdate(7L, List.of(11L))).thenReturn(List.of(item));
        when(menuRepository.findAllForOrderUpdate(List.of(21L))).thenReturn(List.of(menu));
        when(orderRepository.saveAndFlush(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.create(7L, "손님", "repeat", request);
        String fingerprint = capturedSavedOrder().getRequestFingerprint();
        Order previous = Order.create(7L, "손님", "takeout", "cash", null, 2000, "repeat", fingerprint);
        when(orderRepository.findByCustomerIdAndIdempotencyKey(7L, "repeat")).thenReturn(Optional.of(previous));

        var response = service.create(7L, "손님", "repeat", request);

        assertEquals(2000, response.totalAmount());
        verify(cartItemRepository).deleteAllByIdInBatch(List.of(11L));
    }

    @Test
    void rejectsCartItemsThatDoNotBelongToCurrentUser() {
        when(orderRepository.findByCustomerIdAndIdempotencyKey(7L, "foreign")).thenReturn(Optional.empty());
        when(cartItemRepository.findOwnedForUpdate(7L, List.of(91L))).thenReturn(List.of());

        assertThrows(OrderException.class, () -> service.create(7L, "손님", "foreign",
                new CreateOrderRequest(List.of(91L), "dine-in", "card", null, null)));
        verify(orderRepository, never()).saveAndFlush(any());
        verify(cartItemRepository, never()).deleteAllByIdInBatch(anyCollection());
    }

    @Test
    void listsOnlyCurrentCustomerOrdersNewestFirst() {
        when(orderRepository.findAllByCustomerId(eq(7L), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(2, 5), 0));

        var response = service.list(7L, 2, 5);

        assertEquals(2, response.page());
        assertEquals(5, response.size());
        ArgumentCaptor<PageRequest> captor = ArgumentCaptor.forClass(PageRequest.class);
        verify(orderRepository).findAllByCustomerId(eq(7L), captor.capture());
        assertEquals(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")), captor.getValue().getSort());
    }

    @Test
    void hidesOrdersThatDoNotBelongToCurrentCustomer() {
        when(orderRepository.findByIdAndCustomerId(99L, 7L)).thenReturn(Optional.empty());

        assertThrows(OrderException.class, () -> service.get(7L, 99L));
    }

    @Test
    void rejectsReusingIdempotencyKeyForDifferentPayload() {
        CartItem item = cartItem(11L, 1, null);
        Menu menu = menu(21L, "쿠키", 2000, false, false, true);
        CreateOrderRequest request = new CreateOrderRequest(List.of(11L), "takeout", "cash", null, 2000);
        when(orderRepository.findByCustomerIdAndIdempotencyKey(7L, "reuse")).thenReturn(Optional.empty());
        when(cartItemRepository.findOwnedForUpdate(7L, List.of(11L))).thenReturn(List.of(item));
        when(menuRepository.findAllForOrderUpdate(List.of(21L))).thenReturn(List.of(menu));
        when(orderRepository.saveAndFlush(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.create(7L, "손님", "reuse", request);
        Order savedOrder = capturedSavedOrder();
        when(orderRepository.findByCustomerIdAndIdempotencyKey(7L, "reuse"))
                .thenReturn(Optional.of(savedOrder));

        assertThrows(OrderException.class, () -> service.create(7L, "손님", "reuse",
                new CreateOrderRequest(List.of(11L), "dine-in", "cash", null, 2000)));
        verify(cartItemRepository).deleteAllByIdInBatch(List.of(11L));
    }

    @Test
    void rejectsEmptyDuplicateAndInvalidOrderInputs() {
        assertThrows(OrderException.class, () -> service.create(7L, "손님", "empty",
                new CreateOrderRequest(List.of(), "dine-in", "card", null, null)));
        assertThrows(OrderException.class, () -> service.create(7L, "손님", "duplicate",
                new CreateOrderRequest(List.of(11L, 11L), "dine-in", "card", null, null)));
        assertThrows(OrderException.class, () -> service.create(7L, "손님", "bad-type",
                new CreateOrderRequest(List.of(11L), "drive-through", "card", null, null)));
        assertThrows(OrderException.class, () -> service.create(7L, "손님", "long-request",
                new CreateOrderRequest(List.of(11L), "dine-in", "cash", "가".repeat(101), null)));
        assertThrows(OrderException.class, () -> service.create(7L, "손님", "bad key",
                new CreateOrderRequest(List.of(11L), "dine-in", "card", null, null)));
        verify(orderRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsUnavailableMenuAndUnsupportedTemperature() {
        CartItem item = cartItem(11L, 1, "iced");
        Menu unavailable = menu(21L, "판매 중지 메뉴", 2000, false, true, false);
        when(orderRepository.findByCustomerIdAndIdempotencyKey(7L, "unavailable")).thenReturn(Optional.empty());
        when(cartItemRepository.findOwnedForUpdate(7L, List.of(11L))).thenReturn(List.of(item));
        when(menuRepository.findAllForOrderUpdate(List.of(21L))).thenReturn(List.of(unavailable));

        assertThrows(OrderException.class, () -> service.create(7L, "손님", "unavailable",
                new CreateOrderRequest(List.of(11L), "takeout", "card", null, null)));
        verify(cartItemRepository, never()).deleteAllByIdInBatch(anyCollection());
    }

    @Test
    void rejectsTemperatureThatMenuDoesNotSupport() {
        CartItem item = cartItem(11L, 1, "iced");
        Menu hotOnly = menu(21L, "핫 전용 메뉴", 2000, true, false, true);
        when(orderRepository.findByCustomerIdAndIdempotencyKey(7L, "temperature")).thenReturn(Optional.empty());
        when(cartItemRepository.findOwnedForUpdate(7L, List.of(11L))).thenReturn(List.of(item));
        when(menuRepository.findAllForOrderUpdate(List.of(21L))).thenReturn(List.of(hotOnly));

        assertThrows(OrderException.class, () -> service.create(7L, "손님", "temperature",
                new CreateOrderRequest(List.of(11L), "takeout", "card", null, null)));
        verify(orderRepository, never()).saveAndFlush(any());
    }

    private Order capturedSavedOrder() {
        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    private Order savedOrder() {
        return Order.create(7L, "손님", "takeout", "cash", null, 2000, "repeat", "unused");
    }

    private CartItem cartItem(Long id, int quantity, String temperature) {
        CartItem item = org.mockito.Mockito.mock(CartItem.class);
        lenient().when(item.getQuantity()).thenReturn(quantity);
        lenient().when(item.getTemperature()).thenReturn(temperature);
        Menu menu = org.mockito.Mockito.mock(Menu.class);
        when(menu.getId()).thenReturn(id + 10);
        when(item.getMenu()).thenReturn(menu);
        return item;
    }

    private Menu menu(Long id, String name, int price, boolean supportsHot, boolean supportsIced,
            boolean available) {
        Menu menu = org.mockito.Mockito.mock(Menu.class);
        when(menu.getId()).thenReturn(id);
        lenient().when(menu.getName()).thenReturn(name);
        lenient().when(menu.getImageUrl()).thenReturn("/images/menus/latte.svg");
        lenient().when(menu.getPrice()).thenReturn(price);
        lenient().when(menu.isAvailable()).thenReturn(available);
        lenient().when(menu.isArchived()).thenReturn(false);
        lenient().when(menu.isSupportsHot()).thenReturn(supportsHot);
        lenient().when(menu.isSupportsIced()).thenReturn(supportsIced);
        return menu;
    }
}
