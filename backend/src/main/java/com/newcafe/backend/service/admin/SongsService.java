package com.newcafe.backend.service.admin;

import com.newcafe.backend.common.error.SongException;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;

import java.time.Instant;
import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("adminSongsService")
@RequiredArgsConstructor
public class SongsService {

    private final SongRepository songRepository;
    private final MusicBoxStateRepository musicBoxStateRepository;

    @Transactional(readOnly = true)
    public List<Song> list() {
        return songRepository.findAll();
    }

    @Transactional
    public Song addToPlaylist(Long id, String youtubeVideoId, Integer durationSeconds) {
        MusicBoxState state = musicBoxStateRepository.findForUpdate();

        Song song = songRepository.findById(id)
                //orElseThrow() -> 옵셔널에서 값을 꺼내거나 없으면 예외 던지기
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        int order = nextPlaylistOrder();
        song.queue(youtubeVideoId, durationSeconds);
        song.setPlaylistOrder(order);

        playNextIfIdle();
        state.touch(Instant.now());

        return song;
    }

    @Transactional
    public Song editPlaylistItem(Long id, String youtubeVideoId, Integer durationSeconds) {
        MusicBoxState state = musicBoxStateRepository.findForUpdate();

        Song song = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        song.updatePlaylistItem(youtubeVideoId, durationSeconds);

        state.touch(Instant.now());

        return song;
    }

    @Transactional
    public void playNow(Long id) {
        MusicBoxState state = musicBoxStateRepository.findForUpdate();

        Song target = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        songRepository.findFirstByStatus(SongStatus.playing).ifPresent(current -> {
            current.requeue();
            current.setPlaylistOrder(firstPlaylistOrder() - 1);
        });

        target.play();
        state.touch(Instant.now());
    }

    @Transactional
    public void finishCurrent(Long id) {
        MusicBoxState state = musicBoxStateRepository.findForUpdate();

        Song current = songRepository.findById(id).orElse(null);
        if (current == null || current.getStatus() != SongStatus.playing) {
            return;
        }

        current.finish();

        playNextIfIdle();
        state.touch(Instant.now());
    }

    @Transactional
    public void cancelCurrent(Long id) {
        MusicBoxState state = musicBoxStateRepository.findForUpdate();

        Song current = songRepository.findById(id).orElse(null);
        if (current == null || current.getStatus() != SongStatus.playing) {
            return;
        }

        current.cancel();

        playNextIfIdle();
        state.touch(Instant.now());
    }

    @Transactional
    public void cancelRequest(Long id) {
        MusicBoxState state = musicBoxStateRepository.findForUpdate();

        Song song = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        song.cancel();
        state.touch(Instant.now());
    }

    @Transactional
    public void returnToInbox(Long id) {
        MusicBoxState state = musicBoxStateRepository.findForUpdate();

        Song song = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        song.returnToInbox();
        state.touch(Instant.now());
    }

    @Transactional
    public void moveToPlayed(Long id) {
        MusicBoxState state = musicBoxStateRepository.findForUpdate();

        Song song = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        song.markAsPlayed();
        state.touch(Instant.now());
    }

    @Transactional
    public void moveInPlaylist(Long id, String direction) {
        MusicBoxState state = musicBoxStateRepository.findForUpdate();

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

        state.touch(Instant.now());
    }

    private int firstPlaylistOrder() {
        return songRepository.findByStatus(SongStatus.queued).stream()
                .mapToInt(Song::getPlaylistOrder)
                .min()
                .orElse(1);
    }

    private void playNextIfIdle() {
        if (songRepository.findFirstByStatus(SongStatus.playing).isPresent()) {
            return;
        }

        songRepository.findFirstByStatusOrderByPlaylistOrderAsc(SongStatus.queued)
                .ifPresent(Song::play);
    }

    private int nextPlaylistOrder() {
        return songRepository.findByStatus(SongStatus.queued).stream()
                .mapToInt(Song::getPlaylistOrder)
                .max()
                .orElse(0) + 1;
    }
}
