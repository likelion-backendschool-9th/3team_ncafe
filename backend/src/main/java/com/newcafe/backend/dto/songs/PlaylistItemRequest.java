package com.newcafe.backend.dto.songs;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record PlaylistItemRequest(
        @NotNull(message = "신청곡을 선택해 주세요.")
        Long songId,

        @NotBlank(message = "YouTube 영상 ID를 입력해 주세요.")
        String youtubeVideoId,

        @Positive(message = "영상 길이는 0초보다 커야 합니다.")
        @Max(value = 21600, message = "영상 길이는 6시간을 넘을 수 없습니다.")
        Integer durationSeconds
) {
}
