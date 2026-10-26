package com.newcafe.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
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
import com.newcafe.backend.entity.song.SongTiming;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;
import com.newcafe.backend.service.SongsService;
import com.newcafe.backend.service.support.MusicBoxSettler;

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

    private static final Instant STARTED_AT = Instant.parse("2026-10-26T03:00:00Z");
    private static final String VALID_BODY = """
            {"songTitle":" 밤편지 ","artist":"아이유","story":"오늘 첫 출근했어요"}
            """;

    private SongRepository songRepository;
    private SongsService songsService;

    @BeforeEach
    void setUp() {
        songRepository = mock(SongRepository.class);
        MusicBoxStateRepository musicBoxStateRepository = mock(MusicBoxStateRepository.class);
        MusicBoxState state = new MusicBoxState();
        ReflectionTestUtils.setField(state, "revision", 5L);
        when(musicBoxStateRepository.findById(MusicBoxState.ID)).thenReturn(Optional.of(state));
        when(musicBoxStateRepository.findForUpdate()).thenReturn(state);
        when(songRepository.save(any(Song.class))).thenAnswer(invocation -> {
            Song song = invocation.getArgument(0);
            ReflectionTestUtils.setField(song, "id", 1L);
            return song;
        });
        songsService = new SongsService(songRepository, musicBoxStateRepository,
                new MusicBoxSettler(songRepository, musicBoxStateRepository),
                Clock.fixed(Instant.parse("2026-10-26T03:01:00Z"), ZoneOffset.UTC));
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
        mockMvc(visitor()).perform(post("/api/v1/musicbox/songs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        verify(songRepository, never()).save(any());
    }

    @Test
    void s17ListIsOpenToVisitorsAndHidesMemberId() throws Exception {
        when(songRepository.findByStatusOrderByCreatedAtAsc(SongStatus.pending)).thenReturn(List.of(song(41L)));

        mockMvc(visitor()).perform(get("/api/v1/musicbox/songs"))
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

        mockMvc(visitor()).perform(get("/api/v1/songs/now"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current.id").value(20))
                .andExpect(jsonPath("$.current.endsAt").exists())
                .andExpect(jsonPath("$.serverNow").exists())
                .andExpect(jsonPath("$.revision").value(5));
    }

    @Test
    void s20NowWithoutPlayingSongReturnsNullCurrent() throws Exception {
        mockMvc(visitor()).perform(get("/api/v1/songs/now"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current").isEmpty())
                .andExpect(jsonPath("$.revision").value(5));
    }

    private CurrentUserContext member() {
        return () -> new AuthenticatedUser(7L, "민지");
    }

    private CurrentUserContext visitor() {
        return () -> {
            throw new AuthenticationRequiredException();
        };
    }

    private MockMvc mockMvc(CurrentUserContext currentUserContext) {
        return MockMvcBuilders.standaloneSetup(new SongsController(songsService, currentUserContext))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    private Song song(Long id) {
        Song song = new Song(7L, "민지", "밤편지", "아이유", "사연");
        ReflectionTestUtils.setField(song, "id", id);
        return song;
    }
}
