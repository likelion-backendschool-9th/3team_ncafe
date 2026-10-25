package com.newcafe.backend.entity.song;

import java.time.Instant;

// 재생 중인 곡의 시작 시각과 길이. 정리가 필요한지 잠그기 전에 확인할 때 쓴다.
public record SongTiming(Instant startedAt, Integer durationSeconds) {

    public boolean isDue(Instant now) {
        Instant end = Song.endsAt(startedAt, durationSeconds);
        return end != null && !end.isAfter(now);
    }
}
