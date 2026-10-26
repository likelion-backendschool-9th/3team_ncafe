package com.newcafe.backend.entity.song;

import java.time.Instant;
import java.util.List;

// 재생 시간이 다 된 곡을 지난 선곡으로 넘기고 대기열의 다음 곡을 튼다.
// 저장소·트랜잭션 없이 넘겨받은 곡만 바꾸며, 잠금과 revision 증가는 호출한 서비스가 맡는다.
public final class SongSettlement {

    private SongSettlement() {
    }

    /**
     * @param playing 지금 재생 중인 곡. 없으면 null
     * @param queue   대기열. playlistOrder 오름차순이어야 한다.
     * @return 상태가 바뀐 곡이 있으면 true
     */
    public static boolean settle(Song playing, List<Song> queue, Instant now) {
        boolean changed = false;
        Song current = playing;
        int nextIndex = 0;

        while (current != null) {
            Instant end = current.endsAt();
            if (end == null || end.isAfter(now)) {
                return changed;
            }

            current.finish(end);
            changed = true;

            // 길이를 아는 곡은 앞 곡이 끝났어야 할 시각부터 친다. 모르는 곡은 그 시각부터 세면 끝났는지 알 수 없어 지금부터 시작한다.
            current = nextIndex < queue.size() ? queue.get(nextIndex++) : null;
            if (current != null) {
                current.play(current.getDurationSeconds() != null ? end : now);
            }
        }

        return changed;
    }
}
