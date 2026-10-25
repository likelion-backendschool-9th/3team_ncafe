package com.newcafe.backend.controller.admin;

import com.newcafe.backend.dto.songs.CurrentSongRequest;
import com.newcafe.backend.dto.songs.PlaylistItemRequest;
import com.newcafe.backend.dto.songs.PlaylistOrderRequest;
import com.newcafe.backend.dto.songs.SongResponse;
import com.newcafe.backend.entity.song.Song;
import com.newcafe.backend.service.admin.SongsService;

import jakarta.validation.Valid;

import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// TODO: feature/session-auth 머지 후 관리자 권한 체크 추가
@RestController("adminSongsController")
@RequestMapping("/api/v1/admin/songs")
@RequiredArgsConstructor
public class SongsController {

    private final SongsService songsService;

    @GetMapping
    public List<SongResponse> list() {
        return songsService.list().stream().map(SongResponse::from).toList();
    }

    @PutMapping("/{id}/cancel")
    public void cancel(@PathVariable Long id) {
        songsService.cancelRequest(id);
    }

    @PostMapping("/playlist")
    public SongResponse addToPlaylist(@Valid @RequestBody PlaylistItemRequest request) {
        Song song = songsService.addToPlaylist(request.songId(), request.youtubeVideoId(), request.durationSeconds());
        return SongResponse.from(song);
    }

    @PutMapping("/playlist/{id}/order")
    public void reorder(@PathVariable Long id, @Valid @RequestBody PlaylistOrderRequest request) {
        songsService.moveInPlaylist(id, request.direction());
    }

    @PutMapping("/playlist/{id}")
    public SongResponse editPlaylistItem(@PathVariable Long id, @Valid @RequestBody PlaylistItemRequest request) {
        Song song = songsService.editPlaylistItem(id, request.youtubeVideoId(), request.durationSeconds());
        return SongResponse.from(song);
    }

    @PostMapping("/playlist/{id}/play")
    public void playNow(@PathVariable Long id) {
        songsService.playNow(id);
    }

    @PostMapping("/current/finish")
    public void finishCurrent(@Valid @RequestBody CurrentSongRequest request) {
        songsService.finishCurrent(request.id());
    }

    @PostMapping("/current/cancel")
    public void cancelCurrent(@Valid @RequestBody CurrentSongRequest request) {
        songsService.cancelCurrent(request.id());
    }
}
