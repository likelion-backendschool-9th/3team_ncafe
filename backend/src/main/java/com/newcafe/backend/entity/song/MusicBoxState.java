package com.newcafe.backend.entity.song;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import java.time.Instant;

import lombok.Getter;

// 뮤직박스 상태관리
@Entity
@Getter
public class MusicBoxState {

    @Id
    private Long id;

    private Long revision;

    private Instant updatedAt;

    public MusicBoxState() {
        this.id = 1L;
        this.revision = 0L;
        this.updatedAt = Instant.now();
    }

    public void touch(Instant now) {
        this.revision = this.revision + 1;
        this.updatedAt = now;
    }
}
