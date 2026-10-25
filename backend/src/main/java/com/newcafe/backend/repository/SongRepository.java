package com.newcafe.backend.repository;

import com.newcafe.backend.entity.song.Song;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SongRepository extends JpaRepository<Song, Long> {

    List<Song> findByStatus(String status);

    Optional<Song> findFirstByStatusOrderByPlaylistOrderAsc(String status);
}
