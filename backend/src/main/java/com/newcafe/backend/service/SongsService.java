package com.newcafe.backend.service;

import com.newcafe.backend.dto.songs.MusicBoxSongsResponse;
import com.newcafe.backend.dto.songs.NowPlayingResponse;
import com.newcafe.backend.dto.songs.SongResponse;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongSettlement;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 누구나 보는 뮤직박스 신청곡 목록과 현재 곡.
// 조회 중에도 시간이 지난 곡을 정리할 수 있어 읽기 전용 트랜잭션을 쓰지 않는다.
@Service("publicSongsService")
@RequiredArgsConstructor
public class SongsService {

    private final SongRepository songRepository;
    private final MusicBoxStateRepository musicBoxStateRepository;
    private final Clock clock;

    @Transactional
    public MusicBoxSongsResponse list() {
        settleIfDue(clock.instant());

        return new MusicBoxSongsResponse(
                responses(songRepository.findByStatusOrderByPlaylistOrderAsc(SongStatus.queued)),
                responses(songRepository.findByStatusOrderByCreatedAtAsc(SongStatus.pending)),
                responses(songRepository.findTop20ByStatusOrderByPlayedAtDesc(SongStatus.played)));
    }

    @Transactional
    public NowPlayingResponse now() {
        Instant now = clock.instant();
        settleIfDue(now);

        Song playing = songRepository.findFirstByStatus(SongStatus.playing).orElse(null);
        MusicBoxState state = musicBoxStateRepository.findById(MusicBoxState.ID)
                .orElseThrow(() -> new IllegalStateException("뮤직박스 상태가 초기화되지 않았습니다."));

        return NowPlayingResponse.of(playing, now, state.getRevision());
    }

    private void settleIfDue(Instant now) {
        boolean due = songRepository.findPlayingTiming()
                .map(timing -> timing.isDue(now))
                .orElse(false);
        if (!due) {
            return;
        }

        MusicBoxState state = lockState();
        if (settle(now)) {
            state.touch(now);
        }
    }

    private boolean settle(Instant now) {
        Song playing = songRepository.findFirstByStatus(SongStatus.playing).orElse(null);
        if (playing == null) {
            return false;
        }

        return SongSettlement.settle(playing, songRepository.findByStatusOrderByPlaylistOrderAsc(SongStatus.queued), now);
    }

    private MusicBoxState lockState() {
        MusicBoxState state = musicBoxStateRepository.findForUpdate();
        if (state == null) {
            throw new IllegalStateException("뮤직박스 상태가 초기화되지 않았습니다.");
        }

        return state;
    }

    private List<SongResponse> responses(List<Song> songs) {
        return songs.stream().map(SongResponse::from).toList();
    }
}
