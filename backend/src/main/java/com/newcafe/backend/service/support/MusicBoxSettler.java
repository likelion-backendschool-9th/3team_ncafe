package com.newcafe.backend.service.support;

import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongSettlement;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;

import java.time.Instant;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

// 공개·회원·관리자 서비스가 곡을 읽거나 바꾸기 전에 시간이 지난 곡을 정리한다.
// 자기 트랜잭션을 만들지 않고 호출한 서비스의 트랜잭션에서만 실행한다. 읽기 전용 트랜잭션에서 부르면 정리가 저장되지 않는다.
@Component
@Transactional(propagation = Propagation.MANDATORY)
@RequiredArgsConstructor
public class MusicBoxSettler {

    private final SongRepository songRepository;
    private final MusicBoxStateRepository musicBoxStateRepository;

    // 쓰기용. 상태 행을 잠근 뒤 정리한다. revision은 호출한 서비스가 변경을 마친 뒤 한 번 올린다.
    public Locked lockAndSettle(Instant now) {
        MusicBoxState state = lockState();
        return new Locked(state, settle(now));
    }

    // 조회용. 끝난 곡이 있을 때만 잠그고 정리한 뒤 revision을 올린다.
    public void settleIfDue(Instant now) {
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

    // settled: 정리로 상태가 바뀌었는지. 변경 없이 끝나는 쓰기도 정리했다면 revision을 올려야 한다.
    public record Locked(MusicBoxState state, boolean settled) {
    }
}
