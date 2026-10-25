package com.newcafe.backend.dto.orders;

import com.newcafe.backend.entity.order.Order;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OrderSearchRequest(
        @Size(max = 100) String q,
        @Pattern(regexp = Order.STATUS_PATTERN) String status,
        @Pattern(regexp = "active|completed|canceled") String group,
        @Pattern(regexp = "newest|oldest") String sort,
        @Min(0) Integer page,
        @Min(1) @Max(100) Integer size
) {
    public OrderSearchRequest {
        q = q == null || q.isBlank() ? null : q.trim();
        sort = sort == null ? "newest" : sort;
        page = page == null ? 0 : page;
        size = size == null ? 20 : size;
    }
}
