package com.newcafe.backend.entity.song;

public final class SongFields {

    public static final int SONG_TITLE_MAX_LENGTH = 100;
    public static final int ARTIST_MAX_LENGTH = 80;
    public static final int STORY_MAX_LENGTH = 500;

    private SongFields() {
    }

    public static String normalize(String value) {
        return value == null ? null : value.trim();
    }
}
