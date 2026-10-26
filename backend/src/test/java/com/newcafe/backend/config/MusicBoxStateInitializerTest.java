package com.newcafe.backend.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.newcafe.backend.entity.song.MusicBoxState;
import com.newcafe.backend.repository.MusicBoxStateRepository;

import org.junit.jupiter.api.Test;

class MusicBoxStateInitializerTest {

    @Test
    void s1bCreatesSingleStateRowOnlyOnce() {
        MusicBoxStateRepository repository = mock(MusicBoxStateRepository.class);
        MusicBoxStateInitializer initializer = new MusicBoxStateInitializer(repository);
        when(repository.existsById(MusicBoxState.ID)).thenReturn(false, true);

        initializer.run(null);
        initializer.run(null);

        verify(repository, times(1)).save(any(MusicBoxState.class));
    }
}
