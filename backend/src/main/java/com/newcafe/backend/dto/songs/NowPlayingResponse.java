package com.newcafe.backend.dto.songs;

import com.newcafe.backend.entity.song.Song;

import java.time.Instant;

// 손님 화면은 serverNow로 기기 시계와 상관없이 재생 위치를 맞추고, revision이 바뀌었을 때만 목록을 다시 받는다.
public record NowPlayingResponse(
        CurrentSong current,
        Instant serverNow,
        Long revision
) {
    public static NowPlayingResponse of(Song playing, Instant serverNow, Long revision) {
        return new NowPlayingResponse(playing == null ? null : CurrentSong.from(playing), serverNow, revision);
    }

    public record CurrentSong(
            Long id,
            String requesterName,
            String songTitle,
            String artist,
            String story,
            String youtubeVideoId,
            Instant startedAt,
            Integer durationSeconds,
            Instant endsAt
    ) {
        static CurrentSong from(Song song) {
            return new CurrentSong(
                    song.getId(),
                    song.getRequesterName(),
                    song.getSongTitle(),
                    song.getArtist(),
                    song.getStory(),
                    song.getYoutubeVideoId(),
                    song.getStartedAt(),
                    song.getDurationSeconds(),
                    song.endsAt()
            );
        }
    }
}
