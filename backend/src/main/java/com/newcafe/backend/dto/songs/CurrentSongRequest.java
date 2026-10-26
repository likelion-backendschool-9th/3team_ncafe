package com.newcafe.backend.dto.songs;

import jakarta.validation.constraints.NotNull;

public record CurrentSongRequest(
        @NotNull(message = "곡을 선택해 주세요.")
        Long id
) {
}
