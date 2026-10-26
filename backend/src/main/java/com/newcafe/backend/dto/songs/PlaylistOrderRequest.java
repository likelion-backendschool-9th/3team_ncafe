package com.newcafe.backend.dto.songs;

import jakarta.validation.constraints.Pattern;

public record PlaylistOrderRequest(
        @Pattern(regexp = "up|down", message = "방향은 up 또는 down이어야 합니다.")
        String direction
) {
}
