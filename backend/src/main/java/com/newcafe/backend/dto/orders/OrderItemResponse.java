package com.newcafe.backend.dto.orders;

import com.newcafe.backend.entity.order.OrderItem;

public record OrderItemResponse(
        Long menuId,
        String menuName,
        String imageUrl,
        String temperature,
        int unitPrice,
        int quantity,
        int lineTotal) {

    public static OrderItemResponse from(OrderItem item) {
        return new OrderItemResponse(item.getMenu().getId(), item.getMenuName(), item.getImageUrl(),
                item.getTemperature(), item.getUnitPrice(), item.getQuantity(), item.getLineTotal());
    }
}
