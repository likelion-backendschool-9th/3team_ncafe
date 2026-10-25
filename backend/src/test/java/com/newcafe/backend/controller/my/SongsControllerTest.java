package com.newcafe.backend.controller.my;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.error.ApiExceptionHandler;
import com.newcafe.backend.common.security.AuthenticatedUser;
import com.newcafe.backend.common.security.AuthenticationRequiredException;
import com.newcafe.backend.common.security.CurrentUserContext;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;
import com.newcafe.backend.service.my.SongsService;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SongsControllerTest {

    private static final Instant NOW = Instant.parse("2026-10-26T03:04:00Z");
    private static final String VALID_BODY = """
            {"songTitle":" 밤편지 ","artist":"아이유","story":"오늘 첫 출근했어요"}
            """;

    private SongRepository songRepository;
    private SongsService songsService;

    @BeforeEach
    void setUp() {
        songRepository = mock(SongRepository.class);
        MusicBoxStateRepository musicBoxStateRepository = mock(MusicBoxStateRepository.class);
        when(musicBoxStateRepository.findForUpdate()).thenReturn(new MusicBoxState());
        when(songRepository.save(any(Song.class))).thenAnswer(invocation -> {
            Song song = invocation.getArgument(0);
            ReflectionTestUtils.setField(song, "id", 1L);
            return song;
        });
        songsService = new SongsService(songRepository, musicBoxStateRepository, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void s8CreateReturnsPendingSongWithMemberName() throws Exception {
        mockMvc(member()).perform(post("/api/v1/musicbox/songs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.songTitle").value("밤편지"))
                .andExpect(jsonPath("$.requesterName").value("민지"))
                .andExpect(jsonPath("$.status").value("pending"));
    }

    static Stream<String> invalidBodies() {
        return Stream.of(
                VALID_BODY.replace("\" 밤편지 \"", "\"   \""),
                VALID_BODY.replace("\" 밤편지 \"", "\"" + "가".repeat(101) + "\""),
                VALID_BODY.replace("\"아이유\"", "\"" + "가".repeat(81) + "\""),
                VALID_BODY.replace("\"오늘 첫 출근했어요\"", "\"" + "가".repeat(501) + "\""));
    }

    @ParameterizedTest
    @MethodSource("invalidBodies")
    void s9CreateRejectsInvalidInput(String body) throws Exception {
        mockMvc(member()).perform(post("/api/v1/musicbox/songs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        verify(songRepository, never()).save(any());
    }

    @Test
    void s10CreateAcceptsFiveHundredCharacterStory() throws Exception {
        String story = "가".repeat(500);

        mockMvc(member()).perform(post("/api/v1/musicbox/songs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY.replace("오늘 첫 출근했어요", story)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.story").value(story));
    }

    @Test
    void s11CreateRequiresLogin() throws Exception {
        CurrentUserContext anonymous = () -> {
            throw new AuthenticationRequiredException();
        };

        mockMvc(anonymous).perform(post("/api/v1/musicbox/songs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        verify(songRepository, never()).save(any());
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
