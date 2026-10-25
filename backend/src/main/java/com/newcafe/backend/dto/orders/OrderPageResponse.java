package com.newcafe.backend.dto.orders;

import java.util.List;

import org.springframework.data.domain.Page;

public record OrderPageResponse(
        List<OrderResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages) {

    public static OrderPageResponse from(Page<com.newcafe.backend.entity.order.Order> page) {
        return new OrderPageResponse(page.getContent().stream().map(OrderResponse::from).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }
}
