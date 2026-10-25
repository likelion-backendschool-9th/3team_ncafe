package com.newcafe.backend.controller;

import com.newcafe.backend.dto.songs.MusicBoxSongsResponse;
import com.newcafe.backend.dto.songs.NowPlayingResponse;
import com.newcafe.backend.service.SongsService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("publicSongsController")
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SongsController {

    private final SongsService songsService;

    @GetMapping("/musicbox/songs")
    public MusicBoxSongsResponse list() {
        return songsService.list();
    }

    @GetMapping("/songs/now")
    public NowPlayingResponse now() {
        return songsService.now();
    }
}
