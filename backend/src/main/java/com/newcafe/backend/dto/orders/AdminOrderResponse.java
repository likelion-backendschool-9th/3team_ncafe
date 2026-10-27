package com.newcafe.backend.dto.orders;

import com.newcafe.backend.entity.order.Order;
import com.newcafe.backend.entity.order.OrderItem;

import java.time.Instant;
import java.util.List;

public record AdminOrderResponse(Long id, Long customerId, String customerName,
        String orderType, String paymentMethod, String request, String status, Integer statusVersion,
        int totalAmount, List<Item> items, List<String> allowedStatuses, Instant createdAt, Instant updatedAt,
        String cancelReason) {

    public static AdminOrderResponse from(Order order) {
        return new AdminOrderResponse(order.getId(), order.getCustomerId(), order.getCustomerNameSnapshot(),
                order.getOrderType(), order.getPaymentMethod(), order.getRequest(), order.getStatus(),
                order.getStatusVersion(), order.getTotalAmount(), order.getItems().stream().map(Item::from).toList(),
                order.allowedStatuses(), order.getCreatedAt(), order.getUpdatedAt(), order.getCancelReason());
    }

    public record Item(Long id, Long menuId, String menuName, String imageUrl, String temperature,
            int quantity, int unitPrice, int lineTotal) {
        static Item from(OrderItem item) {
            return new Item(item.getId(), item.getMenu().getId(), item.getMenuName(), item.getImageUrl(),
                    item.getTemperature(), item.getQuantity(), item.getUnitPrice(), item.getLineTotal());
        }
    }
}
