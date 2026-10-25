package com.newcafe.backend.entity.song;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Setter;
import lombok.Getter;

@Entity
@Getter
// 뮤직박스 상태관리
public class MusicBoxState {

    @Id
    private Long id;
    @Setter
    private Long currentSongId;

    public MusicBoxState() {
        this.id = 1L;
    }
}
