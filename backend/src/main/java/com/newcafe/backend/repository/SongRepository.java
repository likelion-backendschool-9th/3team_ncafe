package com.newcafe.backend.repository;

import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.entity.song.SongTiming;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SongRepository extends JpaRepository<Song, Long> {

    List<Song> findByStatus(SongStatus status);

    Optional<Song> findFirstByStatus(SongStatus status);

    Optional<Song> findFirstByStatusOrderByPlaylistOrderAsc(SongStatus status);

    List<Song> findByStatusOrderByPlaylistOrderAsc(SongStatus status);

    List<Song> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Song> findByIdAndUserId(Long id, Long userId);

    // 잠그기 전 확인용. 엔티티로 읽으면 잠근 뒤 다시 조회해도 영속성 컨텍스트의 옛 객체가 돌아오므로 값만 읽는다.
    @Query("select new com.newcafe.backend.entity.song.SongTiming(song.startedAt, song.durationSeconds) "
            + "from Song song where song.status = com.newcafe.backend.entity.song.SongStatus.playing")
    Optional<SongTiming> findPlayingTiming();

    List<Song> findByStatusOrderByCreatedAtAsc(SongStatus status);

    // 공개 목록의 지난 선곡은 최근 20곡만 보여 준다.
    List<Song> findTop20ByStatusOrderByPlayedAtDesc(SongStatus status);
}
