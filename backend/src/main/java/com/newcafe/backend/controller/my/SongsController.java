package com.newcafe.backend.controller.my;

import com.newcafe.backend.common.security.CurrentUserContext;
import com.newcafe.backend.dto.songs.SongResponse;
import com.newcafe.backend.service.my.SongsService;

import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("mySongsController")
@RequestMapping("/api/v1/my/songs")
@RequiredArgsConstructor
public class SongsController {

    private final SongsService songsService;
    private final CurrentUserContext currentUserContext;

    @GetMapping
    public List<SongResponse> list() {
        return songsService.list(currentUserContext.requireCurrentUser().id());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        songsService.delete(currentUserContext.requireCurrentUser().id(), id);
        return ResponseEntity.noContent().build();
    }
}
