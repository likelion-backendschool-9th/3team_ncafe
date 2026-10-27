package com.newcafe.backend.dto.menus;

public record MenuSummaryResponse(
        long totalCount,
        long availableCount,
        long unavailableCount
) {
}
