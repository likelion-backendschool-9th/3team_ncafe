package com.newcafe.backend.dto.menus;

import com.newcafe.backend.entity.menu.MenuFields;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MenuSearchRequest(
        @Size(max = MenuSearchRequest.SEARCH_MAX_LENGTH, message = "검색어는 100자 이하로 입력해 주세요.")
        String q,

        Long categoryId,

        @Pattern(regexp = "available|unavailable", message = "상태는 available 또는 unavailable만 사용할 수 있습니다.")
        String status,

        @Pattern(regexp = "newest|oldest|name|price-low|price-high", message = "지원하지 않는 정렬입니다.")
        String sort,

        @Min(value = 0, message = "page는 0 이상이어야 합니다.")
        Integer page,

        @Min(value = 1, message = "size는 1~100 사이여야 합니다.")
        @Max(value = MenuSearchRequest.PAGE_SIZE_MAX, message = "size는 1~100 사이여야 합니다.")
        Integer size
) {
    public static final int SEARCH_MAX_LENGTH = 100;
    public static final int PAGE_SIZE_DEFAULT = 20;
    public static final int PAGE_SIZE_MAX = 100;

    public MenuSearchRequest {
        q = MenuFields.normalize(q);
        if (q != null && q.isEmpty()) {
            q = null;
        }

        sort = sort == null ? "newest" : sort;
        page = page == null ? 0 : page;
        size = size == null ? PAGE_SIZE_DEFAULT : size;
    }

    public Boolean available() {
        return status == null ? null : "available".equals(status);
    }
}
