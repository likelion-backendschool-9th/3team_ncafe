package com.newcafe.backend.dto.songs;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PlaylistItemRequest(
        @NotNull(message = "신청곡을 선택해 주세요.")
        Long songId,

        @NotBlank(message = "YouTube 영상 ID를 입력해 주세요.")
        String youtubeVideoId
) {
}
