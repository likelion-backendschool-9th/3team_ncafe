package com.newcafe.backend.service.admin;

import com.newcafe.backend.common.error.SongException;
import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import com.newcafe.backend.repository.SongRepository;

import java.time.Instant;
import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SongsService {

    private final SongRepository songRepository;
    private final MusicBoxStateRepository musicBoxStateRepository;

    @Transactional(readOnly = true)
    public List<Song> list() {
        return songRepository.findAll();
    }

    @Transactional
    public Song addToPlaylist(Long id, String youtubeVideoId) {
        Song song = songRepository.findById(id)
                //orElseThrow() -> 옵셔널에서 값을 꺼내거나 없으면 예외 던지기
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        if (!"pending".equals(song.getStatus())) {
            throw new SongException(SongException.Reason.CONFLICT, "접수 상태인 곡만 플레이리스트에 담을 수 있습니다.");
        }

        song.setYoutubeVideoId(youtubeVideoId);
        song.setPlaylistOrder(nextPlaylistOrder());
        song.setStatus("queued");

        playNextIfIdle();

        return song;
    }

    @Transactional
    public Song editPlaylistItem(Long id, String youtubeVideoId) {
        Song song = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        if (!"queued".equals(song.getStatus())) {
            throw new SongException(SongException.Reason.CONFLICT, "플레이리스트에 있는 곡만 수정할 수 있습니다.");
        }

        song.setYoutubeVideoId(youtubeVideoId);

        return song;
    }

    @Transactional
    public void playNow(Long id) {
        Song target = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        if (!"queued".equals(target.getStatus())) {
            throw new SongException(SongException.Reason.CONFLICT, "플레이리스트에 있는 곡만 바로 재생할 수 있습니다.");
        }

        MusicBoxState state = musicBoxStateRepository.findForUpdate();
        Long currentSongId = state.getCurrentSongId();
        if (currentSongId != null) {
            songRepository.findById(currentSongId).ifPresent(current -> {
                current.setStatus("queued");
                current.setPlaylistOrder(firstPlaylistOrder() - 1);
                current.setStartedAt(null);
            });
        }

        startPlaying(target, state);
    }

    @Transactional
    public void finishCurrent(Long id) {
        MusicBoxState state = musicBoxStateRepository.findForUpdate();
        if (!id.equals(state.getCurrentSongId())) {
            return;
        }

        Song current = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        current.setStatus("played");
        current.setPlayedAt(Instant.now());
        current.setStartedAt(null);
        state.setCurrentSongId(null);

        playNextIfIdle();
    }

    @Transactional
    public void cancelCurrent(Long id) {
        MusicBoxState state = musicBoxStateRepository.findForUpdate();
        if (!id.equals(state.getCurrentSongId())) {
            return;
        }

        Song current = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        current.setStatus("pending");
        current.setPlaylistOrder(null);
        current.setStartedAt(null);
        state.setCurrentSongId(null);

        playNextIfIdle();
    }

    @Transactional
    public void cancelRequest(Long id) {
        Song song = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        if (!"pending".equals(song.getStatus())) {
            throw new SongException(SongException.Reason.CONFLICT, "접수 상태인 곡만 취소할 수 있습니다.");
        }

        song.setStatus("cancelled");
    }

    @Transactional
    public void returnToInbox(Long id) {
        Song song = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        if (!"queued".equals(song.getStatus()) && !"played".equals(song.getStatus())) {
            throw new SongException(SongException.Reason.CONFLICT, "플레이리스트나 재생완료 상태인 곡만 되돌릴 수 있습니다.");
        }

        song.setStatus("pending");
        song.setPlaylistOrder(null);
        song.setPlayedAt(null);
    }

    @Transactional
    public void moveToPlayed(Long id) {
        Song song = songRepository.findById(id)
                .orElseThrow(() -> new SongException(SongException.Reason.NOT_FOUND, "신청곡을 찾을 수 없습니다."));

        if (!"queued".equals(song.getStatus())) {
            throw new SongException(SongException.Reason.CONFLICT, "플레이리스트에 있는 곡만 재생완료로 옮길 수 있습니다.");
        }

        song.setStatus("played");
        song.setPlaylistOrder(null);
        song.setPlayedAt(Instant.now());
    }

    @Transactional
    public void moveInPlaylist(Long id, String direction) {
        List<Song> playlist = songRepository.findByStatus("queued").stream()
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
    }

    private int firstPlaylistOrder() {
        return songRepository.findByStatus("queued").stream()
                .mapToInt(Song::getPlaylistOrder)
                .min()
                .orElse(1);
    }

    private void playNextIfIdle() {
        MusicBoxState state = musicBoxStateRepository.findForUpdate();
        if (state.getCurrentSongId() != null) {
            return;
        }

        songRepository.findFirstByStatusOrderByPlaylistOrderAsc("queued")
                .ifPresent(next -> startPlaying(next, state));
    }

    private void startPlaying(Song song, MusicBoxState state) {
        song.setStatus("playing");
        song.setStartedAt(Instant.now());
        state.setCurrentSongId(song.getId());
    }

    private int nextPlaylistOrder() {
        return songRepository.findByStatus("queued").stream()
                .mapToInt(Song::getPlaylistOrder)
                .max()
                .orElse(0) + 1;
    }
}
