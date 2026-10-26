package com.newcafe.backend.controller;

import com.newcafe.backend.common.security.AuthenticatedUser;
import com.newcafe.backend.common.security.CurrentUserContext;
import com.newcafe.backend.dto.songs.CreateSongRequest;
import com.newcafe.backend.dto.songs.MusicBoxSongsResponse;
import com.newcafe.backend.dto.songs.NowPlayingResponse;
import com.newcafe.backend.dto.songs.SongResponse;
import com.newcafe.backend.service.SongsService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("publicSongsController")
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SongsController {

    private final SongsService songsService;
    private final CurrentUserContext currentUserContext;

    @PostMapping("/musicbox/songs")
    public ResponseEntity<SongResponse> create(@Valid @RequestBody CreateSongRequest request) {
        AuthenticatedUser user = currentUserContext.requireCurrentUser();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(songsService.create(user.id(), user.displayName(), request));
    }

    @GetMapping("/musicbox/songs")
    public MusicBoxSongsResponse list() {
        return songsService.list();
    }

    @GetMapping("/songs/now")
    public NowPlayingResponse now() {
        return songsService.now();
    }
}
