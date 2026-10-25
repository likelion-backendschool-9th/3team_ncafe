package com.newcafe.backend.controller.admin;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.error.ApiExceptionHandler;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;
import com.newcafe.backend.service.admin.SongsService;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SongsControllerTest {

    private SongRepository songRepository;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        songRepository = mock(SongRepository.class);
        MusicBoxStateRepository musicBoxStateRepository = mock(MusicBoxStateRepository.class);
        SongsService songsService = new SongsService(songRepository, musicBoxStateRepository);

        mockMvc = MockMvcBuilders.standaloneSetup(new SongsController(songsService))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void listReturnsSongs() throws Exception {
        Song song = newSong(1L);

        when(songRepository.findAll()).thenReturn(List.of(song));

        mockMvc.perform(get("/api/v1/admin/songs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].songTitle").value("이등병의 편지"));
    }

    @Test
    void addToPlaylistRejectsMissingSong() throws Exception {
        when(songRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/admin/songs/playlist")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"songId\":99,\"youtubeVideoId\":\"abc123\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    private Song newSong(Long id) {
        Song song = new Song(1L, "강태윤", "이등병의 편지", "김광석", "사연");
        ReflectionTestUtils.setField(song, "id", id);
        return song;
    }
}
