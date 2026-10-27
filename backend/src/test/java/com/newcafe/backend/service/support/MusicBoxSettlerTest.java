package com.newcafe.backend.service.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;
import com.newcafe.backend.entity.user.TestUsers;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

class MusicBoxSettlerTest {

    private static final Instant STARTED_AT = Instant.parse("2026-10-26T03:00:00Z");

    private SongRepository songRepository;
    private MusicBoxStateRepository musicBoxStateRepository;
    private MusicBoxSettler settler;

    @BeforeEach
    void setUp() {
        songRepository = mock(SongRepository.class);
        musicBoxStateRepository = mock(MusicBoxStateRepository.class);
        settler = new MusicBoxSettler(songRepository, musicBoxStateRepository);
    }

    @Test
    void runsOnlyInsideCallersTransaction() {
        Transactional transactional = MusicBoxSettler.class.getAnnotation(Transactional.class);

        assertEquals(Propagation.MANDATORY, transactional.propagation());
        assertFalse(transactional.readOnly());
    }

    @Test
    void lockAndSettleSettlesWithoutTouching() {
        MusicBoxState state = new MusicBoxState();
        Song current = new Song(TestUsers.withId(7L), "민지", "밤편지", "아이유", "사연");
        current.queue("abcdefghijk", 200);
        current.play(STARTED_AT);
        when(musicBoxStateRepository.findForUpdate()).thenReturn(state);
        when(songRepository.findFirstByStatus(SongStatus.playing)).thenReturn(Optional.of(current));
        when(songRepository.findByStatusOrderByPlaylistOrderAsc(SongStatus.queued)).thenReturn(List.of());

        MusicBoxState locked = settler.lockAndSettle(STARTED_AT.plusSeconds(300));

        assertSame(state, locked);
        assertEquals(SongStatus.played, current.getStatus());
        assertEquals(0L, state.getRevision());
    }

    @Test
    void lockAndSettleFailsClearlyWithoutStateRow() {
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> settler.lockAndSettle(STARTED_AT));

        assertEquals("뮤직박스 상태가 초기화되지 않았습니다.", exception.getMessage());
    }
}
