package com.newcafe.backend.config;

import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.repository.MusicBoxStateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

// 재생·순서 변경이 잠글 music_box_state 단일 행(id=1)을 만든다. 이미 있으면 그대로 둔다.
@Component
@RequiredArgsConstructor
public class MusicBoxStateInitializer implements ApplicationRunner {

    private final MusicBoxStateRepository musicBoxStateRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (musicBoxStateRepository.existsById(MusicBoxState.ID)) {
            return;
        }

        musicBoxStateRepository.save(new MusicBoxState());
    }
}
