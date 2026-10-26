package com.newcafe.backend.dto.users;

import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserSearchRequest(
        @Size(max = UserSearchRequest.SEARCH_MAX_LENGTH, message = "검색어는 100자 이하로 입력해 주세요.")
        String q,

        @Pattern(regexp = UserValues.STATUS_PATTERN, message = "상태는 active 또는 suspended만 사용할 수 있습니다.")
        String status,

        @Pattern(regexp = UserValues.ROLE_PATTERN, message = "권한은 customer 또는 admin만 사용할 수 있습니다.")
        String role,

        @Pattern(regexp = "name|email", message = "지원하지 않는 정렬입니다.")
        String sort,

        @Min(value = 0, message = "page는 0 이상이어야 합니다.")
        Integer page,

        @Min(value = 1, message = "size는 1~100 사이여야 합니다.")
        @Max(value = UserSearchRequest.PAGE_SIZE_MAX, message = "size는 1~100 사이여야 합니다.")
        Integer size
) {
    public static final int SEARCH_MAX_LENGTH = 100;
    public static final int PAGE_SIZE_DEFAULT = 20;
    public static final int PAGE_SIZE_MAX = 100;

    public UserSearchRequest {
        q = q == null ? null : q.trim();
        if (q != null && q.isEmpty()) {
            q = null;
        }

        sort = sort == null ? "name" : sort;
        page = page == null ? 0 : page;
        size = size == null ? PAGE_SIZE_DEFAULT : size;
    }

    public UserStatus statusFilter() {
        return status == null ? null : UserValues.status(status);
    }

    public UserRole roleFilter() {
        return role == null ? null : UserValues.role(role);
    }
}
