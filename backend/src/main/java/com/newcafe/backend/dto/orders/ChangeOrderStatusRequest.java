package com.newcafe.backend.dto.orders;

import com.newcafe.backend.entity.order.Order;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ChangeOrderStatusRequest(
        @NotNull @Positive Long id,
        @NotNull @Pattern(regexp = Order.STATUS_PATTERN) String expectedStatus,
        @NotNull @Min(0) Integer statusVersion,
        @NotNull @Pattern(regexp = Order.STATUS_PATTERN) String nextStatus,
        @Size(max = Order.MAX_CANCEL_REASON_LENGTH, message = "취소 사유는 200자 이내로 입력해 주세요.") String cancelReason
) {
    public ChangeOrderStatusRequest(Long id, String expectedStatus, Integer statusVersion, String nextStatus) {
        this(id, expectedStatus, statusVersion, nextStatus, null);
    }
}
