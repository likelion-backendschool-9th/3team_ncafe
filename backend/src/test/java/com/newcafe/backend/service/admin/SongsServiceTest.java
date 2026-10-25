package com.newcafe.backend.service.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.newcafe.backend.common.error.SongException;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;
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
        when(songRepository.findByStatus(SongStatus.queued)).thenReturn(List.of());
        when(musicBoxStateRepository.findForUpdate()).thenReturn(state);
        when(songRepository.findFirstByStatus(SongStatus.playing)).thenReturn(Optional.empty());
        when(songRepository.findFirstByStatusOrderByPlaylistOrderAsc(SongStatus.queued)).thenReturn(Optional.of(song));

        service.addToPlaylist(1L, "abc123", null);

        assertEquals(SongStatus.playing, song.getStatus());
        assertEquals(1L, state.getRevision());
    }

    @Test
    void addToPlaylistRejectsNonPendingSong() {
        Song song = newSong(1L);
        setStatus(song, SongStatus.played);

        when(songRepository.findById(1L)).thenReturn(Optional.of(song));
        when(musicBoxStateRepository.findForUpdate()).thenReturn(new MusicBoxState());

        assertThrows(SongException.class, () -> service.addToPlaylist(1L, "abc123", null));
    }

    @Test
    void finishCurrentIgnoresSongThatIsNotPlaying() {
        Song song = newSong(99L);
        setStatus(song, SongStatus.queued);
        MusicBoxState state = new MusicBoxState();

        when(songRepository.findById(99L)).thenReturn(Optional.of(song));
        when(musicBoxStateRepository.findForUpdate()).thenReturn(state);

        service.finishCurrent(99L);

        assertEquals(SongStatus.queued, song.getStatus());
        assertEquals(0L, state.getRevision());
    }

    private Song newSong(Long id) {
        Song song = new Song(1L, "강태윤", "이등병의 편지", "김광석", "사연");
        ReflectionTestUtils.setField(song, "id", id);
        return song;
    }

    private void setStatus(Song song, SongStatus status) {
        ReflectionTestUtils.setField(song, "status", status);
    }
}
