package com.newcafe.backend.dto.orders;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record CreateOrderRequest(
        @NotEmpty(message = "주문할 장바구니 항목을 선택해 주세요.")
        @Size(max = 100, message = "한 번에 최대 100개 항목까지 주문할 수 있습니다.")
        List<@NotNull(message = "장바구니 항목 ID는 필수입니다.") Long> cartItemIds,
        @NotNull(message = "주문 유형을 선택해 주세요.") String orderType,
        @NotNull(message = "카운터 결제수단을 선택해 주세요.") String paymentMethod,
        @Size(max = 100, message = "요청사항은 100자 이내로 입력해 주세요.") String request,
        @PositiveOrZero(message = "예상 금액은 0 이상이어야 합니다.") Integer expectedTotalAmount) {
}
