package com.newcafe.backend.repository;

import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SongRepository extends JpaRepository<Song, Long> {

    List<Song> findByStatus(SongStatus status);

    Optional<Song> findFirstByStatus(SongStatus status);

    Optional<Song> findFirstByStatusOrderByPlaylistOrderAsc(SongStatus status);
}
