package com.newcafe.backend.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.error.ApiExceptionHandler;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.entity.menu.MenuDetails;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.entity.user.TestUsers;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;
import com.newcafe.backend.service.HomeService;
import com.newcafe.backend.service.support.MusicBoxSettler;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class HomeControllerTest {

    private static final Instant NOW = Instant.parse("2026-10-27T03:01:00Z");

    private MenuRepository menuRepository;
    private SongRepository songRepository;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        menuRepository = org.mockito.Mockito.mock(MenuRepository.class);
        songRepository = org.mockito.Mockito.mock(SongRepository.class);
        MusicBoxStateRepository musicBoxStateRepository = org.mockito.Mockito.mock(MusicBoxStateRepository.class);
        MusicBoxState state = new MusicBoxState();
        ReflectionTestUtils.setField(state, "revision", 5L);
        when(musicBoxStateRepository.findById(MusicBoxState.ID)).thenReturn(Optional.of(state));
        HomeService homeService = new HomeService(menuRepository, songRepository, musicBoxStateRepository,
                new MusicBoxSettler(songRepository, musicBoxStateRepository), Clock.fixed(NOW, ZoneOffset.UTC));

        mockMvc = MockMvcBuilders.standaloneSetup(new HomeController(homeService))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void s10RecommendedMenusAreReturned() throws Exception {
        List<Menu> menus = IntStream.range(0, 16).mapToObj(i -> recommendedMenu((long) i + 1)).toList();
        when(menuRepository.findTop16ByAvailableTrueAndRecommendedTrueAndArchivedAtIsNullOrderByCreatedAtDescIdDesc())
                .thenReturn(menus);

        mockMvc.perform(get("/api/v1/index/menus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(16))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].recommended").value(true))
                .andExpect(jsonPath("$[0].available").value(true));
    }

    @Test
    void s11NoRecommendedMenusReturnsEmptyList() throws Exception {
        when(menuRepository.findTop16ByAvailableTrueAndRecommendedTrueAndArchivedAtIsNullOrderByCreatedAtDescIdDesc())
                .thenReturn(List.of());

        mockMvc.perform(get("/api/v1/index/menus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void indexSongsReturnCurrentStoryAndFirstThreeOfPlaylist() throws Exception {
        Song playing = song(20L, "밤편지", "첫 출근 사연");
        playing.queue("abcdefghijk", 600);
        playing.play(NOW.minusSeconds(60));
        List<Song> playlist = IntStream.range(0, 4).mapToObj(i -> queued(21L + i)).toList();
        when(songRepository.findFirstByStatus(SongStatus.playing)).thenReturn(Optional.of(playing));
        when(songRepository.findByStatusOrderByPlaylistOrderAsc(SongStatus.queued)).thenReturn(playlist);

        mockMvc.perform(get("/api/v1/index/songs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current.id").value(20))
                .andExpect(jsonPath("$.current.story").value("첫 출근 사연"))
                .andExpect(jsonPath("$.current.endsAt").value("2026-10-27T03:10:01Z"))
                .andExpect(jsonPath("$.nextUp.length()").value(3))
                .andExpect(jsonPath("$.nextUp[0].id").value(21))
                .andExpect(jsonPath("$.nextUp[0].story").value("사연 21"))
                .andExpect(jsonPath("$.playlistCount").value(4))
                .andExpect(jsonPath("$.serverNow").value("2026-10-27T03:01:00Z"))
                .andExpect(jsonPath("$.revision").value(5));
    }

    @Test
    void indexSongsWithoutSongsReturnEmptyState() throws Exception {
        when(songRepository.findFirstByStatus(SongStatus.playing)).thenReturn(Optional.empty());
        when(songRepository.findByStatusOrderByPlaylistOrderAsc(SongStatus.queued)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/index/songs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current").doesNotExist())
                .andExpect(jsonPath("$.nextUp.length()").value(0))
                .andExpect(jsonPath("$.playlistCount").value(0));
    }

    private static Song song(Long id, String title, String story) {
        Song song = new Song(TestUsers.withId(7L), "민지", title, "아이유", story);
        ReflectionTestUtils.setField(song, "id", id);
        return song;
    }

    private static Song queued(Long id) {
        Song song = song(id, "곡 " + id, "사연 " + id);
        song.queue("abcdefghijk", 200);
        song.setPlaylistOrder(id.intValue());
        return song;
    }

    private static Menu recommendedMenu(Long id) {
        Category category = Category.create("커피", 1);
        ReflectionTestUtils.setField(category, "id", 10L);

        Menu menu = Menu.create(category, "menu-" + id, new MenuDetails(
                "메뉴 " + id, "설명", "/images/menus/coffee.png", 4500, true, false, true, true, true));
        ReflectionTestUtils.setField(menu, "id", id);
        ReflectionTestUtils.invokeMethod(menu, "onCreate");
        return menu;
    }
}
