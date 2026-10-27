package com.newcafe.backend.entity.song;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.newcafe.backend.common.error.SongException;
import com.newcafe.backend.common.error.SongException.Reason;
import com.newcafe.backend.entity.user.TestUsers;

import java.time.Instant;

import org.junit.jupiter.api.Test;

class SongTest {

    private static final Instant STARTED_AT = Instant.parse("2026-10-26T03:03:21Z");
    private static final Instant FINISHED_AT = Instant.parse("2026-10-26T03:05:02Z");

    @Test
    void s2PlayRejectsPendingSong() {
        Song song = newSong();

        SongException exception = assertThrows(SongException.class, () -> song.play(STARTED_AT));

        assertEquals(Reason.CONFLICT, exception.getReason());
        assertEquals(SongStatus.pending, song.getStatus());
        assertNull(song.getStartedAt());
    }

    @Test
    void s2bPlayAndFinishRecordGivenTimesAndClearPlaylistOrder() {
        Song song = newSong();
        song.queue("abcdefghijk", 100);
        song.setPlaylistOrder(1);

        song.play(STARTED_AT);

        assertEquals(SongStatus.playing, song.getStatus());
        assertEquals(STARTED_AT, song.getStartedAt());
        assertNull(song.getPlaylistOrder());

        song.finish(FINISHED_AT);

        assertEquals(SongStatus.played, song.getStatus());
        assertEquals(FINISHED_AT, song.getPlayedAt());
        assertNull(song.getStartedAt());
        assertNull(song.getPlaylistOrder());
    }

    private Song newSong() {
        return new Song(TestUsers.withId(7L), "민지", "밤편지", "아이유", "오늘 첫 출근했어요");
    }
}
