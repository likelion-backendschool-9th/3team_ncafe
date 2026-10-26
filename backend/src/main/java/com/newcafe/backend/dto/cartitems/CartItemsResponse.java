package com.newcafe.backend.dto.cartitems;

import com.newcafe.backend.entity.cartitem.CartItem;

import java.util.List;

public record CartItemsResponse(
        List<CartItemResponse> items,
        int totalQuantity,
        long totalAmount
) {

    // totalQuantity는 모든 줄, totalAmount는 주문 가능한 줄만 더한다.
    public static CartItemsResponse from(List<CartItem> cartItems) {
        List<CartItemResponse> items = cartItems.stream().map(CartItemResponse::from).toList();
        int totalQuantity = items.stream().mapToInt(CartItemResponse::quantity).sum();
        long totalAmount = items.stream()
                .filter(CartItemResponse::orderable)
                .mapToLong(CartItemResponse::lineTotal)
                .sum();

        return new CartItemsResponse(items, totalQuantity, totalAmount);
    }
}
