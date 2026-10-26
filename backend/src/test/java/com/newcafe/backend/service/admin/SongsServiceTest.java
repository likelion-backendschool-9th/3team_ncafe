package com.newcafe.backend.service.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.newcafe.backend.common.error.SongException;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;

import java.util.Arrays;
import java.util.Comparator;
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

    @Test
    void playNowWhilePlayingPutsCurrentSongAtFrontOfPlaylist() {
        Song current = queuedSong(1L, 1);
        current.play();
        Song target = queuedSong(2L, 2);
        Song next = queuedSong(3L, 3);
        MusicBoxState state = new MusicBoxState();

        when(musicBoxStateRepository.findForUpdate()).thenReturn(state);
        when(songRepository.findById(2L)).thenReturn(Optional.of(target));
        stubStatusQueries(current, target, next);

        service.playNow(2L);

        assertEquals(SongStatus.playing, target.getStatus());
        assertEquals(SongStatus.queued, current.getStatus());
        assertEquals(1, current.getPlaylistOrder());
        assertEquals(1L, state.getRevision());
    }

    @Test
    void cancelRequestOfPlayingSongStartsNextSong() {
        Song current = queuedSong(1L, 1);
        current.play();
        Song next = queuedSong(2L, 2);
        MusicBoxState state = new MusicBoxState();

        when(musicBoxStateRepository.findForUpdate()).thenReturn(state);
        when(songRepository.findById(1L)).thenReturn(Optional.of(current));
        stubStatusQueries(current, next);

        service.cancelRequest(1L);

        assertEquals(SongStatus.pending, current.getStatus());
        assertEquals(SongStatus.playing, next.getStatus());
        assertEquals(1L, state.getRevision());
    }

    // DB 조회처럼 호출 시점의 상태로 고른다. JPA는 조회 전에 바뀐 엔티티를 flush한다.
    private void stubStatusQueries(Song... songs) {
        when(songRepository.findByStatus(any())).thenAnswer(invocation -> withStatus(invocation.getArgument(0), songs));
        when(songRepository.findFirstByStatus(any())).thenAnswer(invocation ->
                withStatus(invocation.getArgument(0), songs).stream().findFirst());
        when(songRepository.findFirstByStatusOrderByPlaylistOrderAsc(any())).thenAnswer(invocation ->
                withStatus(invocation.getArgument(0), songs).stream()
                        .min(Comparator.comparing(Song::getPlaylistOrder)));
    }

    private List<Song> withStatus(SongStatus status, Song... songs) {
        return Arrays.stream(songs).filter(song -> song.getStatus() == status).toList();
    }

    private Song queuedSong(Long id, int playlistOrder) {
        Song song = newSong(id);
        song.queue("abc123", 200);
        song.setPlaylistOrder(playlistOrder);
        return song;
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
