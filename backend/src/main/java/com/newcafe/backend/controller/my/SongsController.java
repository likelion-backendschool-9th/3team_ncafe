package com.newcafe.backend.controller.my;

import com.newcafe.backend.common.security.AuthenticatedUser;
import com.newcafe.backend.common.security.CurrentUserContext;
import com.newcafe.backend.dto.songs.CreateSongRequest;
import com.newcafe.backend.dto.songs.SongResponse;
import com.newcafe.backend.service.my.SongsService;

import jakarta.validation.Valid;

import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("mySongsController")
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

    @GetMapping("/my/songs")
    public List<SongResponse> list() {
        return songsService.listMine(currentUserContext.requireCurrentUser().id());
    }

    @DeleteMapping("/my/songs/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        songsService.delete(currentUserContext.requireCurrentUser().id(), id);
        return ResponseEntity.noContent().build();
    }
}
