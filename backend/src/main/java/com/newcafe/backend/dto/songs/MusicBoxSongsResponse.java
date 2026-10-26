package com.newcafe.backend.dto.songs;

import java.util.List;

public record MusicBoxSongsResponse(
        List<SongResponse> playlist,
        List<SongResponse> inbox,
        List<SongResponse> played
) {
}
