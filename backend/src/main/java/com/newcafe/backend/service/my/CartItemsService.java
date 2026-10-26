package com.newcafe.backend.service.my;

import com.newcafe.backend.common.error.CartItemException;
import com.newcafe.backend.common.error.CartItemException.Reason;
import com.newcafe.backend.dto.cartitems.CartItemQuantityRequest;
import com.newcafe.backend.dto.cartitems.CartItemRequest;
import com.newcafe.backend.dto.cartitems.CartItemResponse;
import com.newcafe.backend.dto.cartitems.CartItemsResponse;
import com.newcafe.backend.entity.cartitem.CartItem;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.repository.CartItemRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.repository.UserRepository;

import java.util.Optional;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("myCartItemsService")
@RequiredArgsConstructor
public class CartItemsService {

    private final CartItemRepository cartItemRepository;
    private final MenuRepository menuRepository;
    private final UserRepository userRepository;

    public record Added(CartItemResponse item, boolean created) {
    }

    @Transactional
    public Added add(Long userId, Long menuId, CartItemRequest request) {
        lockMember(userId);
        Menu menu = menuRepository.findByIdAndArchivedAtIsNull(menuId)
                .orElseThrow(() -> new CartItemException(Reason.NOT_FOUND, "메뉴를 찾을 수 없습니다."));
        if (!menu.isAvailable()) {
            throw new CartItemException(Reason.MENU_UNAVAILABLE, "판매 중지된 메뉴는 담을 수 없습니다.");
        }
        String temperature = request.temperature();
        validateTemperature(menu, temperature);

        Optional<CartItem> existing = temperature == null
                ? cartItemRepository.findByUserIdAndMenu_IdAndTemperatureIsNull(userId, menuId)
                : cartItemRepository.findByUserIdAndMenu_IdAndTemperature(userId, menuId, temperature);
        if (existing.isPresent()) {
            CartItem item = existing.get();
            item.addQuantity(request.quantity());
            return new Added(CartItemResponse.from(item), false);
        }

        CartItem created = cartItemRepository.save(CartItem.create(userId, menu, temperature, request.quantity()));
        return new Added(CartItemResponse.from(created), true);
    }

    @Transactional(readOnly = true)
    public CartItemsResponse list(Long userId) {
        return CartItemsResponse.from(cartItemRepository.findAllByUserIdOrderByIdAsc(userId));
    }

    @Transactional
    public CartItemResponse changeQuantity(Long userId, Long cartItemId, CartItemQuantityRequest request) {
        lockMember(userId);
        CartItem item = findOwned(userId, cartItemId);
        item.changeQuantity(request.quantity());
        return CartItemResponse.from(item);
    }

    @Transactional
    public void remove(Long userId, Long cartItemId) {
        lockMember(userId);
        cartItemRepository.delete(findOwned(userId, cartItemId));
    }

    // 남의 줄도 없는 줄과 같은 404로 답해 존재를 알리지 않는다.
    private CartItem findOwned(Long userId, Long cartItemId) {
        return cartItemRepository.findByIdAndUserId(cartItemId, userId)
                .orElseThrow(() -> new CartItemException(Reason.NOT_FOUND, "장바구니 항목을 찾을 수 없습니다."));
    }

    // 같은 회원의 장바구니 변경을 한 순서로 적용해, 동시에 담아도 같은 메뉴·온도 줄이 둘 생기지 않게 한다.
    private void lockMember(Long userId) {
        userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalStateException("로그인 회원을 찾을 수 없습니다."));
    }

    private static void validateTemperature(Menu menu, String temperature) {
        boolean hasOptions = menu.isSupportsHot() || menu.isSupportsIced();
        if (temperature == null) {
            if (hasOptions) {
                throw new CartItemException(Reason.INVALID_INPUT, "온도를 선택해 주세요.");
            }
            return;
        }
        if (("hot".equals(temperature) && !menu.isSupportsHot())
                || ("iced".equals(temperature) && !menu.isSupportsIced())) {
            throw new CartItemException(Reason.INVALID_INPUT, "이 메뉴에서 선택할 수 없는 온도입니다.");
        }
    }
}
