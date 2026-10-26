package com.newcafe.backend.service.my;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.newcafe.backend.common.error.SongException;
import com.newcafe.backend.common.error.SongException.Reason;
import com.newcafe.backend.dto.songs.SongResponse;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.entity.song.SongTiming;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;
import com.newcafe.backend.service.support.MusicBoxSettler;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class SongsServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-26T03:04:00Z");

    private SongRepository songRepository;
    private MusicBoxStateRepository musicBoxStateRepository;
    private MusicBoxState state;
    private SongsService service;

    @BeforeEach
    void setUp() {
        songRepository = mock(SongRepository.class);
        musicBoxStateRepository = mock(MusicBoxStateRepository.class);
        state = new MusicBoxState();
        when(musicBoxStateRepository.findForUpdate()).thenReturn(state);
        service = new SongsService(songRepository,
                new MusicBoxSettler(songRepository, musicBoxStateRepository), Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void s12ListReturnsOnlyMembersSongsFromRepository() {
        Song song = song(1L, 7L);
        when(songRepository.findByUserIdOrderByCreatedAtDesc(7L)).thenReturn(List.of(song));

        List<SongResponse> songs = service.list(7L);

        assertEquals(List.of(1L), songs.stream().map(SongResponse::id).toList());
        verify(musicBoxStateRepository, never()).findForUpdate();
    }

    @Test
    void s13ListReturnsEmptyWhenMemberHasNoSongs() {
        assertEquals(List.of(), service.list(9L));
    }

    @Test
    void listSettlesEndedSongBeforeReading() {
        Song current = playing(10L, 7L, Instant.parse("2026-10-26T03:00:00Z"), 200);
        when(songRepository.findPlayingTiming()).thenReturn(Optional.of(new SongTiming(current.getStartedAt(), 200)));
        when(songRepository.findFirstByStatus(SongStatus.playing)).thenReturn(Optional.of(current));
        when(songRepository.findByUserIdOrderByCreatedAtDesc(7L)).thenReturn(List.of(current));

        List<SongResponse> songs = service.list(7L);

        assertEquals("played", songs.get(0).status());
        assertEquals(1L, state.getRevision());
    }

    @Test
    void s14DeleteRemovesQueuedSongAndTouchesOnce() {
        Song song = song(10L, 7L);
        song.queue("abcdefghijk", 100);
        when(songRepository.findByIdAndUserId(10L, 7L)).thenReturn(Optional.of(song));

        service.delete(7L, 10L);

        verify(songRepository).delete(song);
        assertEquals(1L, state.getRevision());
    }

    @Test
    void s15DeleteRejectsOtherMembersSong() {
        SongException exception = assertThrows(SongException.class, () -> service.delete(7L, 11L));

        assertEquals(Reason.NOT_FOUND, exception.getReason());
        verify(songRepository, never()).delete(any());
        assertEquals(0L, state.getRevision());
    }

    @Test
    void s16DeleteRejectsPlayingSong() {
        Song song = playing(12L, 7L, NOW.minusSeconds(10), 200);
        when(songRepository.findFirstByStatus(SongStatus.playing)).thenReturn(Optional.of(song));
        when(songRepository.findByIdAndUserId(12L, 7L)).thenReturn(Optional.of(song));

        SongException exception = assertThrows(SongException.class, () -> service.delete(7L, 12L));

        assertEquals(Reason.CONFLICT, exception.getReason());
        verify(songRepository, never()).delete(any());
    }

    @Test
    void s16bDeleteSettlesEndedPlayingSongFirst() {
        Song song = playing(12L, 7L, NOW.minusSeconds(300), 200);
        when(songRepository.findFirstByStatus(SongStatus.playing)).thenReturn(Optional.of(song));
        when(songRepository.findByIdAndUserId(12L, 7L)).thenReturn(Optional.of(song));

        service.delete(7L, 12L);

        assertEquals(SongStatus.played, song.getStatus());
        verify(songRepository).delete(song);
        assertEquals(1L, state.getRevision());
    }

    private Song playing(Long id, Long userId, Instant startedAt, Integer durationSeconds) {
        Song song = song(id, userId);
        song.queue("abcdefghijk", durationSeconds);
        song.play(startedAt);
        return song;
    }

    private Song song(Long id, Long userId) {
        Song song = new Song(userId, "민지", "밤편지", "아이유", "사연");
        ReflectionTestUtils.setField(song, "id", id);
        return song;
    }
}
