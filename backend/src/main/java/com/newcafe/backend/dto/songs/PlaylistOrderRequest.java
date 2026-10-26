package com.newcafe.backend.dto.songs;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record PlaylistOrderRequest(
        @NotNull(message = "방향을 선택해 주세요.")
        @Pattern(regexp = "up|down", message = "방향은 up 또는 down이어야 합니다.")
        String direction
) {
}
