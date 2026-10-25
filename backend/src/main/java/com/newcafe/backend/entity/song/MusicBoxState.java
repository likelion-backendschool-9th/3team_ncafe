package com.newcafe.backend.entity.song;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import java.time.Instant;

import lombok.Getter;

// 뮤직박스 상태관리
@Entity
@Getter
public class MusicBoxState {

    public static final Long ID = 1L;

    @Id
    private Long id;

    @Column(nullable = false)
    private Long revision;

    @Column(nullable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant updatedAt;

    public MusicBoxState() {
        this.id = ID;
        this.revision = 0L;
        this.updatedAt = Instant.now();
    }

    public void touch(Instant now) {
        this.revision = this.revision + 1;
        this.updatedAt = now;
    }
}
