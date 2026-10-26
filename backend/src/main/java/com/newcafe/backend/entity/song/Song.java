package com.newcafe.backend.entity.song;

import com.newcafe.backend.common.error.SongException;
import com.newcafe.backend.common.error.SongException.Reason;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import java.time.Duration;
import java.time.Instant;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// 신청곡 하나하나에 대한 데이터
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Song {

    private static final Duration END_GRACE = Duration.ofSeconds(1);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 50)
    private String requesterName;

    @Column(nullable = false, length = 100)
    private String songTitle;

    @Column(nullable = false, length = 80)
    private String artist;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String story;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SongStatus status;

    private String youtubeVideoId;

    @Setter
    private Integer playlistOrder;

    private Integer durationSeconds;

    @Column(nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant createdAt;

    @Column(nullable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant updatedAt;

    @Column(columnDefinition = "TIMESTAMPTZ")
    private Instant playedAt;

    @Column(columnDefinition = "TIMESTAMPTZ")
    private Instant startedAt;

    public Song(Long userId, String requesterName, String songTitle, String artist, String story) {
        this.userId = userId;
        this.requesterName = requesterName;
        this.songTitle = songTitle;
        this.artist = artist;
        this.story = story;
        this.status = SongStatus.pending;
    }

    public void queue(String youtubeVideoId, Integer durationSeconds) {
        requireStatus(SongStatus.pending, "접수 상태인 곡만 플레이리스트에 담을 수 있습니다.");

        this.youtubeVideoId = youtubeVideoId;
        this.durationSeconds = durationSeconds;
        this.status = SongStatus.queued;
    }

    public void updatePlaylistItem(String youtubeVideoId, Integer durationSeconds) {
        requireStatus(SongStatus.queued, "플레이리스트에 있는 곡만 수정할 수 있습니다.");

        this.youtubeVideoId = youtubeVideoId;
        this.durationSeconds = durationSeconds;
    }

    // 시간 경과 정리는 앞 곡이 끝났어야 할 시각을 시작 시각으로 기록한다.
    public void play(Instant at) {
        requireStatus(SongStatus.queued, "플레이리스트에 있는 곡만 바로 재생할 수 있습니다.");

        this.status = SongStatus.playing;
        this.playlistOrder = null;
        this.startedAt = at;
    }

    public void requeue() {
        this.status = SongStatus.queued;
        this.startedAt = null;
    }

    public void finish(Instant at) {
        requireStatus(SongStatus.playing, "재생 중인 곡만 종료할 수 있습니다.");

        this.status = SongStatus.played;
        this.playlistOrder = null;
        this.playedAt = at;
        this.startedAt = null;
    }

    public void cancel() {
        if (status == SongStatus.pending) {
            this.status = SongStatus.cancelled;
            return;
        }

        if (status == SongStatus.playing) {
            this.status = SongStatus.pending;
            this.playlistOrder = null;
            this.startedAt = null;
            return;
        }

        throw new SongException(Reason.CONFLICT, "취소할 수 없는 상태입니다.");
    }

    public void returnToInbox() {
        if (status != SongStatus.queued && status != SongStatus.played) {
            throw new SongException(Reason.CONFLICT, "플레이리스트나 재생완료 상태인 곡만 되돌릴 수 있습니다.");
        }

        this.status = SongStatus.pending;
        this.playlistOrder = null;
        this.playedAt = null;
    }

    public void markAsPlayed(Instant at) {
        requireStatus(SongStatus.queued, "플레이리스트에 있는 곡만 재생완료로 옮길 수 있습니다.");

        this.status = SongStatus.played;
        this.playlistOrder = null;
        this.playedAt = at;
    }

    // 재생 중인 곡이 끝나는 시각. 영상 길이를 모르면 null이다. 광고·버퍼링 여유로 1초를 더한다.
    public Instant endsAt() {
        return endsAt(startedAt, durationSeconds);
    }

    public static Instant endsAt(Instant startedAt, Integer durationSeconds) {
        if (startedAt == null || durationSeconds == null) {
            return null;
        }

        return startedAt.plus(Duration.ofSeconds(durationSeconds)).plus(END_GRACE);
    }

    private void requireStatus(SongStatus expected, String message) {
        if (this.status != expected) {
            throw new SongException(Reason.CONFLICT, message);
        }
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();

        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
