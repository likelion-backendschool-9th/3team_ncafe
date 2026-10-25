package com.newcafe.backend.dto.orders;

import java.util.List;

public record OrderPageResponse(List<AdminOrderResponse> items, int page, int size,
        long totalElements, int totalPages) {
}
