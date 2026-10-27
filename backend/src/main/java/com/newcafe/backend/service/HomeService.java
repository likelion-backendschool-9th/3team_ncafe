package com.newcafe.backend.service;

import com.newcafe.backend.dto.menus.MenuResponse;
import com.newcafe.backend.dto.songs.IndexSongsResponse;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;
import com.newcafe.backend.service.support.MusicBoxSettler;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HomeService {

    // 홈 뮤직박스 칸에 메모로 붙이는 다음 차례 신청곡 수
    static final int NEXT_UP_SIZE = 3;

    private final MenuRepository menuRepository;
    private final SongRepository songRepository;
    private final MusicBoxStateRepository musicBoxStateRepository;
    private final MusicBoxSettler musicBoxSettler;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<MenuResponse> recommendedMenus() {
        return menuRepository.findTop16ByAvailableTrueAndRecommendedTrueAndArchivedAtIsNullOrderByCreatedAtDescIdDesc()
                .stream()
                .map(MenuResponse::from)
                .toList();
    }

    // 시간이 지난 곡을 먼저 정리할 수 있어 읽기 전용 트랜잭션을 쓰지 않는다.
    @Transactional
    public IndexSongsResponse songs() {
        Instant now = clock.instant();
        musicBoxSettler.settleIfDue(now);

        Song playing = songRepository.findFirstByStatus(SongStatus.playing).orElse(null);
        List<Song> playlist = songRepository.findByStatusOrderByPlaylistOrderAsc(SongStatus.queued);
        MusicBoxState state = musicBoxStateRepository.findById(MusicBoxState.ID)
                .orElseThrow(() -> new IllegalStateException("뮤직박스 상태가 초기화되지 않았습니다."));

        return IndexSongsResponse.of(playing, playlist, NEXT_UP_SIZE, now, state.getRevision());
    }
}
