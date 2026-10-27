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

import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        songsService.cancelRequest(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/playlist")
    public SongResponse addToPlaylist(@Valid @RequestBody PlaylistItemRequest request) {
        Song song = songsService.addToPlaylist(request.songId(), request.youtubeVideoId(), request.durationSeconds());
        return SongResponse.from(song);
    }

    @PutMapping("/playlist/{id}/order")
    public ResponseEntity<Void> reorder(@PathVariable Long id, @Valid @RequestBody PlaylistOrderRequest request) {
        songsService.moveInPlaylist(id, request.direction());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/playlist/{id}")
    public SongResponse editPlaylistItem(@PathVariable Long id, @Valid @RequestBody PlaylistItemRequest request) {
        Song song = songsService.editPlaylistItem(id, request.youtubeVideoId(), request.durationSeconds());
        return SongResponse.from(song);
    }

    @PostMapping("/playlist/{id}/play")
    public ResponseEntity<Void> playNow(@PathVariable Long id) {
        songsService.playNow(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/current/finish")
    public ResponseEntity<Void> finishCurrent(@Valid @RequestBody CurrentSongRequest request) {
        songsService.finishCurrent(request.id());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/current/cancel")
    public ResponseEntity<Void> cancelCurrent(@Valid @RequestBody CurrentSongRequest request) {
        songsService.cancelCurrent(request.id());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/return-to-inbox")
    public ResponseEntity<Void> returnToInbox(@PathVariable Long id) {
        songsService.returnToInbox(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/move-to-played")
    public ResponseEntity<Void> moveToPlayed(@PathVariable Long id) {
        songsService.moveToPlayed(id);
        return ResponseEntity.noContent().build();
    }
}
