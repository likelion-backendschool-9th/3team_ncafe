package com.newcafe.backend.entity.song;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.time.Instant;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
// 신청곡 하나하나에 대한 데이터
public class Song {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String requesterName;
    private String songTitle;
    private String artist;
    private String story;

    @Setter
    private String status;

    @Setter
    private String youtubeVideoId;

    @Setter
    private Integer playlistOrder;

    private Instant createdAt;

    @Setter
    private Instant playedAt;

    @Setter
    private Instant startedAt;

    @Setter
    private Integer durationSeconds;

    public Song(String requesterName, String songTitle, String artist, String story) {
        this.requesterName = requesterName;
        this.songTitle = songTitle;
        this.artist = artist;
        this.story = story;
        this.status = "pending";
        this.createdAt = Instant.now();
    }
}
