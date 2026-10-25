package com.newcafe.backend.dto.songs;

import com.newcafe.backend.entity.song.SongFields;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateSongRequest(
        @NotBlank(message = "곡명을 입력해 주세요.")
        @Size(max = SongFields.SONG_TITLE_MAX_LENGTH, message = "곡명은 100자 이하로 입력해 주세요.")
        String songTitle,

        @NotBlank(message = "가수 이름을 입력해 주세요.")
        @Size(max = SongFields.ARTIST_MAX_LENGTH, message = "가수 이름은 80자 이하로 입력해 주세요.")
        String artist,

        @NotBlank(message = "사연을 입력해 주세요.")
        @Size(max = SongFields.STORY_MAX_LENGTH, message = "사연은 500자 이하로 입력해 주세요.")
        String story
) {
    public CreateSongRequest {
        songTitle = SongFields.normalize(songTitle);
        artist = SongFields.normalize(artist);
        story = SongFields.normalize(story);
    }
}
