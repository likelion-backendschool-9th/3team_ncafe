package com.newcafe.backend.dto.users;

public record UserSummaryResponse(
        long totalCount,
        long activeCount,
        long suspendedCount
) {
}
