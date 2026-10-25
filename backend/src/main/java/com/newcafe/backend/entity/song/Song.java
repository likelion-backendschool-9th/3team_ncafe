package com.newcafe.backend.entity.song;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.time.Instant;

@Entity
public class Song {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String requesterName;
    private String songTitle;
    private String artist;
    private String story;
    private String status;
    private String youtubeVideoId;
    private Integer playlistOrder;
    private Instant createdAt;
    private Instant playedAt;
    private Instant startedAt;
    private Integer durationSeconds;

    public Song(String requesterName, String songTitle, String artist, String story) {
        this.requesterName = requesterName;
        this.songTitle = songTitle;
        this.artist = artist;
        this.story = story;
        this.status = "pending";
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getRequesterName() {
        return requesterName;
    }

    public String getSongTitle() {
        return songTitle;
    }

    public String getArtist() {
        return artist;
    }

    public String getStory() {
        return story;
    }

    public String getStatus() {
        return status;
    }

    public String getYoutubeVideoId() {
        return youtubeVideoId;
    }

    public Integer getPlaylistOrder() {
        return playlistOrder;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getPlayedAt() {
        return playedAt;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setYoutubeVideoId(String youtubeVideoId) {
        this.youtubeVideoId = youtubeVideoId;
    }

    public void setPlaylistOrder(Integer playlistOrder) {
        this.playlistOrder = playlistOrder;
    }

    public void setPlayedAt(Instant playedAt) {
        this.playedAt = playedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }
}
