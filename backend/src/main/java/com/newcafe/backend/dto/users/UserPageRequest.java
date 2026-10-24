package com.newcafe.backend.dto.users;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record UserPageRequest(
        @Min(value = 0, message = "page는 0 이상이어야 합니다.")
        Integer page,

        @Min(value = 1, message = "size는 1~100 사이여야 합니다.")
        @Max(value = UserPageRequest.PAGE_SIZE_MAX, message = "size는 1~100 사이여야 합니다.")
        Integer size
) {
    public static final int PAGE_SIZE_DEFAULT = 20;
    public static final int PAGE_SIZE_MAX = 100;

    public UserPageRequest {
        page = page == null ? 0 : page;
        size = size == null ? PAGE_SIZE_DEFAULT : size;
    }
}
