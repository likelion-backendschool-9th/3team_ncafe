package com.newcafe.backend.entity.song;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.newcafe.backend.config.PluralTableNamingStrategy;

import java.util.List;

import org.hibernate.boot.model.naming.Identifier;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.mapping.Column;
import org.hibernate.mapping.Table;
import org.junit.jupiter.api.Test;

class SongMappingTest {

    @Test
    void s1SongAndMusicBoxStateMapToDesignedColumns() {
        StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect")
                .applySetting("hibernate.boot.allow_jdbc_metadata_access", false)
                .applySetting("hibernate.implicit_naming_strategy", PluralTableNamingStrategy.class.getName())
                .applySetting("hibernate.physical_naming_strategy",
                        "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy")
                .build();

        try {
            var metadata = new MetadataSources(registry)
                    .addAnnotatedClass(Song.class)
                    .addAnnotatedClass(MusicBoxState.class)
                    .buildMetadata();
            Table songs = metadata.getEntityBinding(Song.class.getName()).getTable();
            Table state = metadata.getEntityBinding(MusicBoxState.class.getName()).getTable();

            assertEquals("music_requests", songs.getName());
            assertEquals(100L, column(songs, "song_title").getLength());
            assertEquals(80L, column(songs, "artist").getLength());
            assertEquals(50L, column(songs, "requester_name").getLength());
            assertEquals("TEXT", column(songs, "story").getSqlType());

            for (String name : List.of("user_id", "requester_name", "song_title", "artist", "story", "status")) {
                assertFalse(column(songs, name).isNullable(), name);
            }
            for (String name : List.of("youtube_video_id", "playlist_order", "duration_seconds", "started_at",
                    "played_at")) {
                assertTrue(column(songs, name).isNullable(), name);
            }
            for (String name : List.of("created_at", "updated_at", "started_at", "played_at")) {
                assertEquals("TIMESTAMPTZ", column(songs, name).getSqlType(), name);
            }

            assertEquals("music_box_state", state.getName());
            assertFalse(column(state, "revision").isNullable());
            assertFalse(column(state, "updated_at").isNullable());
            assertEquals("TIMESTAMPTZ", column(state, "updated_at").getSqlType());
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }

    private Column column(Table table, String name) {
        return table.getColumn(Identifier.toIdentifier(name));
    }
}
