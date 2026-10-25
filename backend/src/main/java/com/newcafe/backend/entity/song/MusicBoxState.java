package com.newcafe.backend.entity.song;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class MusicBoxState {

    @Id
    private Long id;

    private Long currentSongId;

    public MusicBoxState() {
        this.id = 1L;
    }

    public Long getId() {
        return id;
    }

    public Long getCurrentSongId() {
        return currentSongId;
    }

    public void setCurrentSongId(Long currentSongId) {
        this.currentSongId = currentSongId;
    }
}
