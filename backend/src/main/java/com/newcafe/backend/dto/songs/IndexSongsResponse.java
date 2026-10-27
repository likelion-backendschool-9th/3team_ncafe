package com.newcafe.backend.dto.songs;

import com.newcafe.backend.dto.songs.NowPlayingResponse.CurrentSong;
import com.newcafe.backend.entity.song.Song;

import java.time.Instant;
import java.util.List;

// 홈 뮤직박스 칸: 지금 곡과 사연, 다음 차례 신청곡 몇 곡과 플레이리스트 전체 곡 수.
// serverNow와 revision은 뮤직박스 화면과 같은 방식으로 재생 위치를 맞추고 변경을 알아채는 데 쓴다.
public record IndexSongsResponse(
        CurrentSong current,
        List<SongResponse> nextUp,
        int playlistCount,
        Instant serverNow,
        Long revision
) {
    public static IndexSongsResponse of(Song playing, List<Song> playlist, int nextUpSize, Instant serverNow, Long revision) {
        return new IndexSongsResponse(
                playing == null ? null : CurrentSong.from(playing),
                playlist.stream().limit(nextUpSize).map(SongResponse::from).toList(),
                playlist.size(),
                serverNow,
                revision
        );
    }
}
