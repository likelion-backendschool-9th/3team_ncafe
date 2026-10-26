package com.newcafe.backend.dto.cartitems;

import com.newcafe.backend.entity.cartitem.CartItem;
import com.newcafe.backend.entity.menu.Menu;

// 메뉴명·이미지·가격·판매 여부는 장바구니에 복사하지 않고 지금 메뉴에서 읽는다.
public record CartItemResponse(
        Long id,
        Long menuId,
        String slug,
        String name,
        String imageUrl,
        int unitPrice,
        String temperature,
        int quantity,
        int lineTotal,
        boolean orderable
) {

    public static CartItemResponse from(CartItem item) {
        Menu menu = item.getMenu();
        return new CartItemResponse(
                item.getId(),
                menu.getId(),
                menu.getSlug(),
                menu.getName(),
                menu.getImageUrl(),
                menu.getPrice(),
                item.getTemperature(),
                item.getQuantity(),
                menu.getPrice() * item.getQuantity(),
                item.isOrderable()
        );
    }
}
