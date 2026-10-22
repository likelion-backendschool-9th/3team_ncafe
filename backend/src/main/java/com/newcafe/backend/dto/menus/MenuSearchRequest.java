package com.newcafe.backend.dto.menus;

import com.newcafe.backend.entity.menu.MenuFields;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;

public record MenuSearchRequest(
        String q,

        Long categoryId,

        @Pattern(regexp = "available|unavailable", message = "상태는 available 또는 unavailable만 사용할 수 있습니다.")
        String status,

        @Pattern(regexp = "newest|oldest|name|price-low|price-high", message = "지원하지 않는 정렬입니다.")
        String sort,

        @Min(value = 0, message = "page는 0 이상이어야 합니다.")
        Integer page,

        @Min(value = 1, message = "size는 1~100 사이여야 합니다.")
        @Max(value = MenuFields.PAGE_SIZE_MAX, message = "size는 1~100 사이여야 합니다.")
        Integer size
) {
    public MenuSearchRequest {
        q = MenuFields.normalize(q);
        if (q != null && q.isEmpty()) {
            q = null;
        } else if (q != null && q.length() > MenuFields.SEARCH_MAX_LENGTH) {
            q = q.substring(0, MenuFields.SEARCH_MAX_LENGTH);
        }

        sort = sort == null ? "newest" : sort;
        page = page == null ? 0 : page;
        size = size == null ? MenuFields.PAGE_SIZE_DEFAULT : size;
    }

    public Boolean available() {
        return status == null ? null : "available".equals(status);
    }
}
