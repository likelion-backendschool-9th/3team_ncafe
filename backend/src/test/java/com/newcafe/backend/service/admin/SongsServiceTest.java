package com.newcafe.backend.service.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.newcafe.backend.common.error.SongException;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class SongsServiceTest {

    private SongRepository songRepository;
    private MusicBoxStateRepository musicBoxStateRepository;
    private SongsService service;

    @BeforeEach
    void setUp() {
        songRepository = mock(SongRepository.class);
        musicBoxStateRepository = mock(MusicBoxStateRepository.class);
        service = new SongsService(songRepository, musicBoxStateRepository);
    }

    @Test
    void addToPlaylistStartsPlayingWhenIdle() {
        Song song = newSong(1L);
        MusicBoxState state = new MusicBoxState();

        when(songRepository.findById(1L)).thenReturn(Optional.of(song));
        when(songRepository.findByStatus("queued")).thenReturn(List.of());
        when(musicBoxStateRepository.findForUpdate()).thenReturn(state);
        when(songRepository.findFirstByStatusOrderByPlaylistOrderAsc("queued")).thenReturn(Optional.of(song));

        service.addToPlaylist(1L, "abc123");

        assertEquals("playing", song.getStatus());
        assertEquals(1L, state.getCurrentSongId());
    }

    @Test
    void addToPlaylistRejectsNonPendingSong() {
        Song song = newSong(1L);
        song.setStatus("played");

        when(songRepository.findById(1L)).thenReturn(Optional.of(song));

        assertThrows(SongException.class, () -> service.addToPlaylist(1L, "abc123"));
    }

    @Test
    void finishCurrentIgnoresMismatchedId() {
        MusicBoxState state = new MusicBoxState();
        state.setCurrentSongId(5L);

        when(musicBoxStateRepository.findForUpdate()).thenReturn(state);

        service.finishCurrent(99L);

        assertEquals(5L, state.getCurrentSongId());
    }

    private Song newSong(Long id) {
        Song song = new Song("강태윤", "이등병의 편지", "김광석", "사연");
        ReflectionTestUtils.setField(song, "id", id);
        return song;
    }
}
