package com.newcafe.backend.controller.my;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.error.ApiExceptionHandler;
import com.newcafe.backend.common.security.AuthenticatedUser;
import com.newcafe.backend.common.security.CurrentUserContext;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;
import com.newcafe.backend.service.my.SongsService;
import com.newcafe.backend.service.support.MusicBoxSettler;

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

    private static final Instant NOW = Instant.parse("2026-10-26T03:04:00Z");

    private SongRepository songRepository;
    private SongsService songsService;

    @BeforeEach
    void setUp() {
        songRepository = mock(SongRepository.class);
        MusicBoxStateRepository musicBoxStateRepository = mock(MusicBoxStateRepository.class);
        when(musicBoxStateRepository.findForUpdate()).thenReturn(new MusicBoxState());
        songsService = new SongsService(songRepository,
                new MusicBoxSettler(songRepository, musicBoxStateRepository), Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void s12ListReturnsMembersSongs() throws Exception {
        Song song = new Song(7L, "민지", "밤편지", "아이유", "사연");
        ReflectionTestUtils.setField(song, "id", 3L);
        when(songRepository.findByUserIdOrderByCreatedAtDesc(7L)).thenReturn(List.of(song));

        mockMvc(member()).perform(get("/api/v1/my/songs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(3))
                .andExpect(jsonPath("$[0].userId").doesNotExist());
    }

    @Test
    void s14DeleteReturnsNoContent() throws Exception {
        Song song = new Song(7L, "민지", "밤편지", "아이유", "사연");
        when(songRepository.findByIdAndUserId(10L, 7L)).thenReturn(Optional.of(song));

        mockMvc(member()).perform(delete("/api/v1/my/songs/10"))
                .andExpect(status().isNoContent());
    }

    @Test
    void s15DeleteOtherMembersSongReturnsNotFound() throws Exception {
        mockMvc(member()).perform(delete("/api/v1/my/songs/11"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void s16DeletePlayingSongReturnsConflict() throws Exception {
        Song song = new Song(7L, "민지", "밤편지", "아이유", "사연");
        song.queue("abcdefghijk", 200);
        song.play(NOW.minusSeconds(10));
        when(songRepository.findFirstByStatus(SongStatus.playing)).thenReturn(Optional.of(song));
        when(songRepository.findByIdAndUserId(12L, 7L)).thenReturn(Optional.of(song));

        mockMvc(member()).perform(delete("/api/v1/my/songs/12"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("재생 중인 신청곡은 삭제할 수 없습니다."));
    }

    private CurrentUserContext member() {
        return () -> new AuthenticatedUser(7L, "민지");
    }

    private MockMvc mockMvc(CurrentUserContext currentUserContext) {
        return MockMvcBuilders.standaloneSetup(new SongsController(songsService, currentUserContext))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }
}
