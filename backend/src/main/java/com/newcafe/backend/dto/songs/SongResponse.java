package com.newcafe.backend.dto.songs;

import com.newcafe.backend.entity.song.Song;

import java.time.Instant;

public record SongResponse(
        Long id,
        String requesterName,
        String songTitle,
        String artist,
        String story,
        String status,
        String youtubeVideoId,
        Integer playlistOrder,
        Instant createdAt,
        Instant playedAt,
        Instant startedAt,
        Integer durationSeconds
) {
    public static SongResponse from(Song song) {
        return new SongResponse(
                song.getId(),
                song.getRequesterName(),
                song.getSongTitle(),
                song.getArtist(),
                song.getStory(),
                song.getStatus(),
                song.getYoutubeVideoId(),
                song.getPlaylistOrder(),
                song.getCreatedAt(),
                song.getPlayedAt(),
                song.getStartedAt(),
                song.getDurationSeconds()
        );
    }
}
