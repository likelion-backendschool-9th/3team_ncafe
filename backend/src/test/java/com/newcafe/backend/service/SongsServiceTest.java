package com.newcafe.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.newcafe.backend.dto.songs.CreateSongRequest;
import com.newcafe.backend.dto.songs.MusicBoxSongsResponse;
import com.newcafe.backend.dto.songs.NowPlayingResponse;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class SongsServiceTest {

    private static final Instant STARTED_AT = Instant.parse("2026-10-26T03:00:00Z");

    private SongRepository songRepository;
    private MusicBoxStateRepository musicBoxStateRepository;
    private MusicBoxState state;

    @BeforeEach
    void setUp() {
        songRepository = mock(SongRepository.class);
        musicBoxStateRepository = mock(MusicBoxStateRepository.class);
        state = new MusicBoxState();
        ReflectionTestUtils.setField(state, "revision", 5L);
        when(musicBoxStateRepository.findForUpdate()).thenReturn(state);
        when(musicBoxStateRepository.findById(MusicBoxState.ID)).thenReturn(Optional.of(state));
    }

    @Test
    void s8CreateSavesPendingSongForMemberAndTouchesOnce() {
        when(songRepository.save(any(Song.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SongResponse response = service("03:04:00").create(7L, "민지",
                new CreateSongRequest(" 밤편지 ", "아이유", "오늘 첫 출근했어요"));

        assertEquals("밤편지", response.songTitle());
        assertEquals("민지", response.requesterName());
        assertEquals("pending", response.status());
        assertEquals(6L, state.getRevision());
    }

    @Test
    void s7DoesNotLockWhenPlayingSongHasNotEnded() {
        Song current = playing(20L, 200);
        playingNow(current);

        NowPlayingResponse response = service("03:01:00").now();

        verify(musicBoxStateRepository, never()).findForUpdate();
        assertEquals(20L, response.current().id());
        assertEquals(5L, response.revision());
    }

    @Test
    void s7bSettlesEndedSongOnceBeforeAnswering() {
        Song current = playing(20L, 200);
        Song next = queued(21L, 100);
        playingNow(current);
        when(songRepository.findByStatusOrderByPlaylistOrderAsc(SongStatus.queued)).thenReturn(List.of(next));
        when(songRepository.findFirstByStatus(SongStatus.playing))
                .thenReturn(Optional.of(current), Optional.of(next));

        NowPlayingResponse response = service("03:04:00").now();

        verify(musicBoxStateRepository, times(1)).findForUpdate();
        assertEquals(21L, response.current().id());
        assertEquals(6L, response.revision());
    }

    @Test
    void s17ListGroupsPlaylistInboxAndPlayed() {
        when(songRepository.findByStatusOrderByPlaylistOrderAsc(SongStatus.queued))
                .thenReturn(List.of(queued(31L, 100), queued(32L, 100)));
        when(songRepository.findByStatusOrderByCreatedAtAsc(SongStatus.pending))
                .thenReturn(List.of(pending(41L), pending(42L)));
        when(songRepository.findTop20ByStatusOrderByPlayedAtDesc(SongStatus.played))
                .thenReturn(List.of(played(51L)));

        MusicBoxSongsResponse response = service("03:01:00").list();

        assertEquals(List.of(31L, 32L), ids(response.playlist()));
        assertEquals(List.of(41L, 42L), ids(response.inbox()));
        assertEquals(List.of(51L), ids(response.played()));
    }

    @Test
    void s17bListAsksRepositoryForRecentTwentyPlayedSongs() {
        List<Song> recent = new ArrayList<>();
        for (long id = 1; id <= 20; id++) {
            recent.add(played(id));
        }
        when(songRepository.findTop20ByStatusOrderByPlayedAtDesc(SongStatus.played)).thenReturn(recent);

        MusicBoxSongsResponse response = service("03:01:00").list();

        assertEquals(20, response.played().size());
        verify(songRepository).findTop20ByStatusOrderByPlayedAtDesc(SongStatus.played);
        verify(songRepository, never()).findByStatus(SongStatus.played);
    }

    @Test
    void s18ListSettlesEndedSongFirst() {
        Song current = playing(20L, 200);
        Song next = queued(21L, 100);
        playingNow(current);
        when(songRepository.findByStatusOrderByPlaylistOrderAsc(SongStatus.queued))
                .thenReturn(List.of(next), List.of());
        when(songRepository.findTop20ByStatusOrderByPlayedAtDesc(SongStatus.played)).thenReturn(List.of(current));

        MusicBoxSongsResponse response = service("03:04:00").list();

        assertEquals(SongStatus.played, current.getStatus());
        assertEquals(SongStatus.playing, next.getStatus());
        assertEquals(List.of(), response.playlist());
        assertEquals(List.of(20L), ids(response.played()));
    }

    @Test
    void s19NowReturnsTimesForPlaybackPosition() {
        Song current = playing(20L, 200);
        playingNow(current);

        NowPlayingResponse response = service("03:01:00").now();

        assertEquals(STARTED_AT, response.current().startedAt());
        assertEquals(200, response.current().durationSeconds());
        assertEquals(at("03:03:21"), response.current().endsAt());
        assertEquals(at("03:01:00"), response.serverNow());
        assertEquals(5L, response.revision());
    }

    @Test
    void s20NowWithoutPlayingSong() {
        NowPlayingResponse response = service("03:01:00").now();

        assertNull(response.current());
        assertEquals(at("03:01:00"), response.serverNow());
        assertEquals(5L, response.revision());
    }

    @Test
    void s21RevisionChangesAfterMemberRequestsSong() {
        Clock clock = clock("03:01:00");
        when(songRepository.save(any(Song.class))).thenAnswer(invocation -> invocation.getArgument(0));
        SongsService service = new SongsService(songRepository, musicBoxStateRepository,
                new MusicBoxSettler(songRepository, musicBoxStateRepository), clock);

        service.create(7L, "민지", new CreateSongRequest("밤편지", "아이유", "사연"));

        assertEquals(6L, service.now().revision());
    }

    private SongsService service(String time) {
        return new SongsService(songRepository, musicBoxStateRepository,
                new MusicBoxSettler(songRepository, musicBoxStateRepository), clock(time));
    }

    private void playingNow(Song current) {
        when(songRepository.findPlayingTiming())
                .thenReturn(Optional.of(new SongTiming(current.getStartedAt(), current.getDurationSeconds())));
        when(songRepository.findFirstByStatus(SongStatus.playing)).thenReturn(Optional.of(current));
    }

    private Song playing(Long id, Integer durationSeconds) {
        Song song = queued(id, durationSeconds);
        song.play(STARTED_AT);
        return song;
    }

    private Song played(Long id) {
        Song song = playing(id, 100);
        song.finish(STARTED_AT.plusSeconds(101));
        return song;
    }

    private Song queued(Long id, Integer durationSeconds) {
        Song song = pending(id);
        song.queue("abcdefghijk", durationSeconds);
        return song;
    }

    private Song pending(Long id) {
        Song song = new Song(7L, "민지", "밤편지", "아이유", "사연");
        ReflectionTestUtils.setField(song, "id", id);
        return song;
    }

    private List<Long> ids(List<SongResponse> songs) {
        return songs.stream().map(SongResponse::id).toList();
    }

    private Clock clock(String time) {
        return Clock.fixed(at(time), ZoneOffset.UTC);
    }

    private Instant at(String time) {
        return Instant.parse("2026-10-26T" + time + "Z");
    }
}
