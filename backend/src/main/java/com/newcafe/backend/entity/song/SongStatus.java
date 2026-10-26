package com.newcafe.backend.entity.song;

// DB에는 이 상수 이름 그대로(소문자) 저장된다 (@Enumerated(EnumType.STRING))
public enum SongStatus {
    pending,
    queued,
    playing,
    played,
    cancelled
}
