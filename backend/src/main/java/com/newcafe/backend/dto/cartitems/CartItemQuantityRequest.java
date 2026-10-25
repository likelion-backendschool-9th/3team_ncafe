package com.newcafe.backend.dto.cartitems;

import com.newcafe.backend.entity.cartitem.CartItem;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CartItemQuantityRequest(
        @NotNull(message = "수량을 입력해 주세요.")
        @Min(value = CartItem.MIN_QUANTITY, message = "수량은 1~20개 사이로 입력해 주세요.")
        @Max(value = CartItem.MAX_QUANTITY, message = "수량은 1~20개 사이로 입력해 주세요.")
        Integer quantity
) {
}
