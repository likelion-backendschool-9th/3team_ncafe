package com.newcafe.backend.dto.orders;

import com.newcafe.backend.entity.order.Order;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

public record ChangeOrderStatusRequest(
        @NotNull @Positive Long id,
        @NotNull @Pattern(regexp = Order.STATUS_PATTERN) String expectedStatus,
        @NotNull @Min(0) Integer statusVersion,
        @NotNull @Pattern(regexp = Order.STATUS_PATTERN) String nextStatus
) {
}
