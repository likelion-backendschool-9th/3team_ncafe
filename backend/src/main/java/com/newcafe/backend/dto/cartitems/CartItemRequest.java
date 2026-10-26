package com.newcafe.backend.dto.cartitems;

import com.newcafe.backend.entity.cartitem.CartItem;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CartItemRequest(
        // 온도 옵션이 없는 메뉴는 null이다. 메뉴가 지원하는 온도인지는 Service가 확인한다.
        @Pattern(regexp = "hot|iced", message = "온도는 hot 또는 iced만 사용할 수 있습니다.")
        String temperature,

        @NotNull(message = "수량을 입력해 주세요.")
        @Min(value = CartItem.MIN_QUANTITY, message = "수량은 1~20개 사이로 입력해 주세요.")
        @Max(value = CartItem.MAX_QUANTITY, message = "수량은 1~20개 사이로 입력해 주세요.")
        Integer quantity
) {
}
