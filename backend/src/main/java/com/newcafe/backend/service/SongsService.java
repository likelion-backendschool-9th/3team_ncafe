package com.newcafe.backend.service;

import com.newcafe.backend.dto.songs.CreateSongRequest;
import com.newcafe.backend.dto.songs.MusicBoxSongsResponse;
import com.newcafe.backend.dto.songs.NowPlayingResponse;
import com.newcafe.backend.dto.songs.SongResponse;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;
import com.newcafe.backend.service.support.MusicBoxSettler;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 뮤직박스 신청곡 접수와 누구나 보는 신청곡 목록·현재 곡.
// 상태를 바꿀 때는 뮤직박스 상태 행을 잠그고, 시간이 지난 곡을 먼저 정리한 뒤 바꾸고, revision을 한 번 올린다.
// 조회 중에도 시간이 지난 곡을 정리할 수 있어 읽기 전용 트랜잭션을 쓰지 않는다.
@Service
@RequiredArgsConstructor
public class SongsService {

    private final SongRepository songRepository;
    private final MusicBoxStateRepository musicBoxStateRepository;
    private final MusicBoxSettler musicBoxSettler;
    private final Clock clock;

    @Transactional
    public SongResponse create(Long userId, String requesterName, CreateSongRequest request) {
        Instant now = clock.instant();
        MusicBoxState state = musicBoxSettler.lockAndSettle(now);

        Song song = songRepository.save(
                new Song(userId, requesterName, request.songTitle(), request.artist(), request.story()));

        state.touch(now);
        return SongResponse.from(song);
    }

    @Transactional
    public MusicBoxSongsResponse list() {
        musicBoxSettler.settleIfDue(clock.instant());

        return new MusicBoxSongsResponse(
                responses(songRepository.findByStatusOrderByPlaylistOrderAsc(SongStatus.queued)),
                responses(songRepository.findByStatusOrderByCreatedAtAsc(SongStatus.pending)),
                responses(songRepository.findTop20ByStatusOrderByPlayedAtDesc(SongStatus.played)));
    }

    @Transactional
    public NowPlayingResponse now() {
        Instant now = clock.instant();
        musicBoxSettler.settleIfDue(now);

        Song playing = songRepository.findFirstByStatus(SongStatus.playing).orElse(null);
        MusicBoxState state = musicBoxStateRepository.findById(MusicBoxState.ID)
                .orElseThrow(() -> new IllegalStateException("뮤직박스 상태가 초기화되지 않았습니다."));

        return NowPlayingResponse.of(playing, now, state.getRevision());
    }

    private List<SongResponse> responses(List<Song> songs) {
        return songs.stream().map(SongResponse::from).toList();
    }
}
