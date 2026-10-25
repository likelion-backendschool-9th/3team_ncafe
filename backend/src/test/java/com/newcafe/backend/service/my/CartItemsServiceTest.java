package com.newcafe.backend.service.my;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.newcafe.backend.common.error.CartItemException;
import com.newcafe.backend.common.error.CartItemException.Reason;
import com.newcafe.backend.dto.cartitems.CartItemRequest;
import com.newcafe.backend.entity.cartitem.CartItem;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.entity.menu.MenuDetails;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.repository.CartItemRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.repository.UserRepository;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class CartItemsServiceTest {

    private static final Long MEMBER_ID = 7L;

    @Mock
    private CartItemRepository cartItemRepository;
    @Mock
    private MenuRepository menuRepository;
    @Mock
    private UserRepository userRepository;
    private CartItemsService service;

    @BeforeEach
    void setUp() {
        service = new CartItemsService(cartItemRepository, menuRepository, userRepository);
    }

    @Test
    void s1AddsNewLineAfterLockingMember() {
        Menu coffee = menu(1L, "커피", 3500, true, true, true);
        lockSucceeds();
        when(menuRepository.findByIdAndArchivedAtIsNull(1L)).thenReturn(Optional.of(coffee));
        when(cartItemRepository.findByUserIdAndMenu_IdAndTemperature(MEMBER_ID, 1L, "iced")).thenReturn(Optional.empty());
        when(cartItemRepository.save(any(CartItem.class))).thenAnswer(invocation -> withId(invocation.getArgument(0), 11L));

        CartItemsService.Added added = service.add(MEMBER_ID, 1L, new CartItemRequest("iced", 2));

        assertTrue(added.created());
        assertEquals(11L, added.item().id());
        assertEquals(1L, added.item().menuId());
        assertEquals("iced", added.item().temperature());
        assertEquals(2, added.item().quantity());
        assertEquals(7000, added.item().lineTotal());
        InOrder order = inOrder(userRepository, menuRepository, cartItemRepository);
        order.verify(userRepository).findByIdForUpdate(MEMBER_ID);
        order.verify(menuRepository).findByIdAndArchivedAtIsNull(1L);
        order.verify(cartItemRepository).save(any(CartItem.class));
    }

    @Test
    void s2SameMenuAndTemperatureMergesUpToTwenty() {
        Menu coffee = menu(1L, "커피", 3500, true, true, true);
        CartItem existing = withId(CartItem.create(MEMBER_ID, coffee, "iced", 2), 11L);
        lockSucceeds();
        when(menuRepository.findByIdAndArchivedAtIsNull(1L)).thenReturn(Optional.of(coffee));
        when(cartItemRepository.findByUserIdAndMenu_IdAndTemperature(MEMBER_ID, 1L, "iced")).thenReturn(Optional.of(existing));

        CartItemsService.Added added = service.add(MEMBER_ID, 1L, new CartItemRequest("iced", 19));

        assertFalse(added.created());
        assertEquals(11L, added.item().id());
        assertEquals(20, added.item().quantity());
        verify(cartItemRepository, never()).save(any());
    }

    @Test
    void s3MenuWithoutTemperatureUsesNullLine() {
        Menu monaka = menu(8L, "모나카", 3000, true, false, false);
        lockSucceeds();
        when(menuRepository.findByIdAndArchivedAtIsNull(8L)).thenReturn(Optional.of(monaka));
        when(cartItemRepository.findByUserIdAndMenu_IdAndTemperatureIsNull(MEMBER_ID, 8L)).thenReturn(Optional.empty());
        when(cartItemRepository.save(any(CartItem.class))).thenAnswer(invocation -> withId(invocation.getArgument(0), 12L));

        CartItemsService.Added added = service.add(MEMBER_ID, 8L, new CartItemRequest(null, 1));

        assertTrue(added.created());
        assertNull(added.item().temperature());
    }

    @Test
    void s4TemperatureMustMatchMenuOptions() {
        Menu coffee = menu(1L, "커피", 3500, true, true, true);
        Menu monaka = menu(8L, "모나카", 3000, true, false, false);
        Menu hotOnly = menu(9L, "쌍화차", 6000, true, true, false);
        lockSucceeds();
        when(menuRepository.findByIdAndArchivedAtIsNull(1L)).thenReturn(Optional.of(coffee));
        when(menuRepository.findByIdAndArchivedAtIsNull(8L)).thenReturn(Optional.of(monaka));
        when(menuRepository.findByIdAndArchivedAtIsNull(9L)).thenReturn(Optional.of(hotOnly));

        assertReason(Reason.INVALID_INPUT, () -> service.add(MEMBER_ID, 1L, new CartItemRequest(null, 1)));
        assertReason(Reason.INVALID_INPUT, () -> service.add(MEMBER_ID, 8L, new CartItemRequest("hot", 1)));
        assertReason(Reason.INVALID_INPUT, () -> service.add(MEMBER_ID, 9L, new CartItemRequest("iced", 1)));
        verify(cartItemRepository, never()).save(any());
    }

    @Test
    void s5MissingOrHiddenMenuIsNotFoundAndSoldOutIsUnavailable() {
        Menu soldOut = menu(2L, "생칡즙", 6000, false, false, true);
        lockSucceeds();
        when(menuRepository.findByIdAndArchivedAtIsNull(999L)).thenReturn(Optional.empty());
        when(menuRepository.findByIdAndArchivedAtIsNull(2L)).thenReturn(Optional.of(soldOut));

        assertReason(Reason.NOT_FOUND, () -> service.add(MEMBER_ID, 999L, new CartItemRequest("iced", 1)));
        assertReason(Reason.MENU_UNAVAILABLE, () -> service.add(MEMBER_ID, 2L, new CartItemRequest("iced", 1)));
        verify(cartItemRepository, never()).save(any());
    }

    private void lockSucceeds() {
        User member = User.createCustomer("테스트 회원", "member@example.com", "{bcrypt}$2a$10$" + "a".repeat(53));
        ReflectionTestUtils.setField(member, "id", MEMBER_ID);
        when(userRepository.findByIdForUpdate(MEMBER_ID)).thenReturn(Optional.of(member));
    }

    private static void assertReason(Reason reason, org.junit.jupiter.api.function.Executable call) {
        assertEquals(reason, assertThrows(CartItemException.class, call).getReason());
    }

    static Menu menu(Long id, String name, int price, boolean available, boolean hot, boolean iced) {
        Category category = Category.create("커피", 1);
        ReflectionTestUtils.setField(category, "id", 10L);
        Menu menu = Menu.create(category, "menu-" + id, new MenuDetails(
                name, name + " 설명", "/images/menus/coffee.jpg", price, available, false, false, hot, iced));
        ReflectionTestUtils.setField(menu, "id", id);
        return menu;
    }

    static CartItem withId(CartItem item, Long id) {
        ReflectionTestUtils.setField(item, "id", id);
        return item;
    }
}
