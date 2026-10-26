package com.newcafe.backend.service.admin;

import com.newcafe.backend.common.error.SongException;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.repository.SongRepository;
import com.newcafe.backend.service.support.MusicBoxSettler;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 조작마다 뮤직박스 상태 행을 잠그고, 시간이 지난 곡을 먼저 정리한 뒤 바꾸고, revision을 한 번 올린다.
@Service("adminSongsService")
@RequiredArgsConstructor
public class SongsService {

    private final SongRepository songRepository;
    private final MusicBoxSettler musicBoxSettler;
    private final Clock clock;

    // 조회 중에도 정리가 일어날 수 있어 읽기 전용 트랜잭션을 쓰지 않는다.
    @Transactional
    public List<Song> list() {
        musicBoxSettler.settleIfDue(clock.instant());

        return songRepository.findAll();
    }

    @Transactional
    public Song addToPlaylist(Long id, String youtubeVideoId, Integer durationSeconds) {
        Instant now = clock.instant();
        MusicBoxState state = musicBoxSettler.lockAndSettle(now);

        Song song = songRepository.findById(id)
                //orElseThrow() -> 옵셔널에서 값을 꺼내거나 없으면 예외 던지기
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        int order = nextPlaylistOrder();
        song.queue(youtubeVideoId, durationSeconds);
        song.setPlaylistOrder(order);

        playNextIfIdle(now);
        state.touch(now);

        return song;
    }

    @Transactional
    public Song editPlaylistItem(Long id, String youtubeVideoId, Integer durationSeconds) {
        Instant now = clock.instant();
        MusicBoxState state = musicBoxSettler.lockAndSettle(now);

        Song song = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        song.updatePlaylistItem(youtubeVideoId, durationSeconds);

        state.touch(now);

        return song;
    }

    @Transactional
    public void playNow(Long id) {
        Instant now = clock.instant();
        MusicBoxState state = musicBoxSettler.lockAndSettle(now);

        Song target = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        // 순서는 되돌리기 전에 구한다. 되돌린 곡은 순서가 비어 있는 채로 대기열 조회에 잡힌다.
        songRepository.findFirstByStatus(SongStatus.playing).ifPresent(current -> {
            int order = firstPlaylistOrder() - 1;
            current.requeue();
            current.setPlaylistOrder(order);
        });

        target.play(now);
        state.touch(now);
    }

    @Transactional
    public void finishCurrent(Long id) {
        Instant now = clock.instant();
        MusicBoxState state = musicBoxSettler.lockAndSettle(now);

        // 화면이 늦게 보낸 요청이면 곡은 그대로 두고, 그 사이 정리된 변화를 알리도록 revision만 올린다.
        Song current = songRepository.findById(id).orElse(null);
        if (current == null || current.getStatus() != SongStatus.playing) {
            state.touch(now);
            return;
        }

        current.finish(now);

        playNextIfIdle(now);
        state.touch(now);
    }

    @Transactional
    public void cancelCurrent(Long id) {
        Instant now = clock.instant();
        MusicBoxState state = musicBoxSettler.lockAndSettle(now);

        // 화면이 늦게 보낸 요청이면 곡은 그대로 두고, 그 사이 정리된 변화를 알리도록 revision만 올린다.
        Song current = songRepository.findById(id).orElse(null);
        if (current == null || current.getStatus() != SongStatus.playing) {
            state.touch(now);
            return;
        }

        current.cancel();

        playNextIfIdle(now);
        state.touch(now);
    }

    @Transactional
    public void cancelRequest(Long id) {
        Instant now = clock.instant();
        MusicBoxState state = musicBoxSettler.lockAndSettle(now);

        Song song = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        boolean wasPlaying = song.getStatus() == SongStatus.playing;
        song.cancel();
        if (wasPlaying) {
            playNextIfIdle(now);
        }

        state.touch(now);
    }

    @Transactional
    public void returnToInbox(Long id) {
        Instant now = clock.instant();
        MusicBoxState state = musicBoxSettler.lockAndSettle(now);

        Song song = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        song.returnToInbox();
        state.touch(now);
    }

    @Transactional
    public void moveToPlayed(Long id) {
        Instant now = clock.instant();
        MusicBoxState state = musicBoxSettler.lockAndSettle(now);

        Song song = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        song.markAsPlayed(now);
        state.touch(now);
    }

    @Transactional
    public void moveInPlaylist(Long id, String direction) {
        Instant now = clock.instant();
        MusicBoxState state = musicBoxSettler.lockAndSettle(now);

        List<Song> playlist = songRepository.findByStatus(SongStatus.queued).stream()
                .sorted((a, b) -> a.getPlaylistOrder() - b.getPlaylistOrder())
                .toList();

        int index = -1;
        for (int i = 0; i < playlist.size(); i++) {
            if (playlist.get(i).getId().equals(id)) {
                index = i;
                break;
            }
        }

        int neighborIndex = "up".equals(direction) ? index - 1 : index + 1;
        if (index < 0 || neighborIndex < 0 || neighborIndex >= playlist.size()) {
            throw new SongException(SongException.Reason.CONFLICT, "순서를 바꿀 수 없습니다.");
        }

        Song target = playlist.get(index);
        Song neighbor = playlist.get(neighborIndex);
        int targetOrder = target.getPlaylistOrder();
        target.setPlaylistOrder(neighbor.getPlaylistOrder());
        neighbor.setPlaylistOrder(targetOrder);

        state.touch(now);
    }

    private int firstPlaylistOrder() {
        return songRepository.findByStatus(SongStatus.queued).stream()
                .mapToInt(Song::getPlaylistOrder)
                .min()
                .orElse(1);
    }

    private void playNextIfIdle(Instant now) {
        if (songRepository.findFirstByStatus(SongStatus.playing).isPresent()) {
            return;
        }

        songRepository.findFirstByStatusOrderByPlaylistOrderAsc(SongStatus.queued)
                .ifPresent(song -> song.play(now));
    }

    private int nextPlaylistOrder() {
        return songRepository.findByStatus(SongStatus.queued).stream()
                .mapToInt(Song::getPlaylistOrder)
                .max()
                .orElse(0) + 1;
    }
}
