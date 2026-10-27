package com.newcafe.backend.dto.orders;

import java.time.Instant;
import java.util.List;

import com.newcafe.backend.entity.order.Order;

public record OrderResponse(
        Long id,
        Instant createdAt,
        String status,
        String orderType,
        String paymentMethod,
        String request,
        int totalAmount,
        List<OrderItemResponse> items,
        String cancelReason) {

    public static OrderResponse from(Order order) {
        return new OrderResponse(order.getId(), order.getCreatedAt(), order.getStatus(), order.getOrderType(),
                order.getPaymentMethod(), order.getRequest(), order.getTotalAmount(),
                order.getItems().stream().map(OrderItemResponse::from).toList(), order.getCancelReason());
    }
}
