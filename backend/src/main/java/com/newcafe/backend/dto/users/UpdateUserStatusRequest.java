package com.newcafe.backend.dto.users;

import com.newcafe.backend.entity.user.UserStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record UpdateUserStatusRequest(
        @NotNull(message = "변경할 이용 상태를 입력해 주세요.")
        @Pattern(regexp = UserStatus.PATTERN, message = "상태는 active 또는 suspended만 사용할 수 있습니다.")
        String status
) {
    public UserStatus toStatus() {
        return UserStatus.from(status);
    }
}
