package com.newcafe.backend.entity.song;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;

class SongSettlementTest {

    private static final Instant NOON = Instant.parse("2026-10-26T03:00:00Z");

    @Test
    void s4FinishesEndedSongAndStartsNextAtItsEndTime() {
        Song current = playing(200, NOON);
        Song next = queued(100);
        Song last = queued(null);

        boolean changed = SongSettlement.settle(current, List.of(next, last), at("03:04:00"));

        assertTrue(changed);
        assertEquals(SongStatus.played, current.getStatus());
        assertEquals(at("03:03:21"), current.getPlayedAt());
        assertEquals(SongStatus.playing, next.getStatus());
        assertEquals(at("03:03:21"), next.getStartedAt());
        assertEquals(SongStatus.queued, last.getStatus());
    }

    @Test
    void s5SettlesSeveralEndedSongsAndStartsUnknownLengthSongNow() {
        Song current = playing(200, NOON);
        Song next = queued(100);
        Song last = queued(null);

        SongSettlement.settle(current, List.of(next, last), at("03:10:00"));

        assertEquals(SongStatus.played, current.getStatus());
        assertEquals(SongStatus.played, next.getStatus());
        assertEquals(at("03:05:02"), next.getPlayedAt());
        assertEquals(SongStatus.playing, last.getStatus());
        assertEquals(at("03:10:00"), last.getStartedAt());
    }

    @Test
    void s6KeepsPlayingWhenLengthIsUnknown() {
        Song current = playing(null, NOON);

        boolean changed = SongSettlement.settle(current, List.of(queued(100)), at("04:00:00"));

        assertFalse(changed);
        assertEquals(SongStatus.playing, current.getStatus());
    }

    @Test
    void keepsPlayingSongBeforeItsEndTime() {
        Song current = playing(200, NOON);

        boolean changed = SongSettlement.settle(current, List.of(), at("03:03:20"));

        assertFalse(changed);
        assertEquals(SongStatus.playing, current.getStatus());
    }

    @Test
    void doesNothingWithoutPlayingSong() {
        Song next = queued(100);

        assertFalse(SongSettlement.settle(null, List.of(next), at("03:04:00")));
        assertEquals(SongStatus.queued, next.getStatus());
    }

    private Song playing(Integer durationSeconds, Instant startedAt) {
        Song song = queued(durationSeconds);
        song.play(startedAt);
        return song;
    }

    private Song queued(Integer durationSeconds) {
        Song song = new Song(7L, "민지", "밤편지", "아이유", "사연");
        song.queue("abcdefghijk", durationSeconds);
        return song;
    }

    private Instant at(String time) {
        return Instant.parse("2026-10-26T" + time + "Z");
    }
}
