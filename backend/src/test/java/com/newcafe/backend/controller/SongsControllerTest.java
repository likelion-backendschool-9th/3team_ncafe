package com.newcafe.backend.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.error.ApiExceptionHandler;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.entity.song.SongTiming;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;
import com.newcafe.backend.service.SongsService;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SongsControllerTest {

    private static final Instant STARTED_AT = Instant.parse("2026-10-26T03:00:00Z");

    private SongRepository songRepository;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        songRepository = mock(SongRepository.class);
        MusicBoxStateRepository musicBoxStateRepository = mock(MusicBoxStateRepository.class);
        MusicBoxState state = new MusicBoxState();
        ReflectionTestUtils.setField(state, "revision", 5L);
        when(musicBoxStateRepository.findById(MusicBoxState.ID)).thenReturn(Optional.of(state));
        SongsService songsService = new SongsService(songRepository, musicBoxStateRepository,
                Clock.fixed(Instant.parse("2026-10-26T03:01:00Z"), ZoneOffset.UTC));

        mockMvc = MockMvcBuilders.standaloneSetup(new SongsController(songsService))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void s17ListIsOpenToVisitorsAndHidesMemberId() throws Exception {
        when(songRepository.findByStatusOrderByCreatedAtAsc(SongStatus.pending)).thenReturn(List.of(song(41L)));

        mockMvc.perform(get("/api/v1/musicbox/songs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.playlist").isArray())
                .andExpect(jsonPath("$.inbox[0].id").value(41))
                .andExpect(jsonPath("$.inbox[0].userId").doesNotExist())
                .andExpect(jsonPath("$.played").isArray());
    }

    @Test
    void s19NowReturnsCurrentSongTimesAndRevision() throws Exception {
        Song current = song(20L);
        current.queue("abcdefghijk", 200);
        current.play(STARTED_AT);
        when(songRepository.findPlayingTiming()).thenReturn(Optional.of(new SongTiming(STARTED_AT, 200)));
        when(songRepository.findFirstByStatus(SongStatus.playing)).thenReturn(Optional.of(current));

        mockMvc.perform(get("/api/v1/songs/now"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current.id").value(20))
                .andExpect(jsonPath("$.current.endsAt").exists())
                .andExpect(jsonPath("$.serverNow").exists())
                .andExpect(jsonPath("$.revision").value(5));
    }

    @Test
    void s20NowWithoutPlayingSongReturnsNullCurrent() throws Exception {
        mockMvc.perform(get("/api/v1/songs/now"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current").isEmpty())
                .andExpect(jsonPath("$.revision").value(5));
    }

    private Song song(Long id) {
        Song song = new Song(7L, "민지", "밤편지", "아이유", "사연");
        ReflectionTestUtils.setField(song, "id", id);
        return song;
    }
}
