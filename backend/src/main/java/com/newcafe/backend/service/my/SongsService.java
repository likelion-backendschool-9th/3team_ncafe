package com.newcafe.backend.service.my;

import com.newcafe.backend.common.error.SongException;
import com.newcafe.backend.common.error.SongException.Reason;
import com.newcafe.backend.dto.songs.SongResponse;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.repository.SongRepository;
import com.newcafe.backend.service.support.MusicBoxSettler;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 회원이 자기 신청곡을 조회·삭제한다.
// 상태를 바꿀 때는 뮤직박스 상태 행을 잠그고, 시간이 지난 곡을 먼저 정리한 뒤 바꾸고, revision을 한 번 올린다.
@Service("mySongsService")
@RequiredArgsConstructor
public class SongsService {

    private final SongRepository songRepository;
    private final MusicBoxSettler musicBoxSettler;
    private final Clock clock;

    // 조회 중에도 정리가 일어날 수 있어 읽기 전용 트랜잭션을 쓰지 않는다.
    @Transactional
    public List<SongResponse> list(Long userId) {
        musicBoxSettler.settleIfDue(clock.instant());

        return songRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(SongResponse::from)
                .toList();
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Instant now = clock.instant();
        MusicBoxState state = musicBoxSettler.lockAndSettle(now);

        Song song = songRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new SongException(Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));
        if (song.getStatus() == SongStatus.playing) {
            throw new SongException(Reason.CONFLICT, "재생 중인 신청곡은 삭제할 수 없습니다.");
        }

        songRepository.delete(song);
        state.touch(now);
    }
}
