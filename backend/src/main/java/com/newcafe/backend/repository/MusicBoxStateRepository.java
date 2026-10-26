package com.newcafe.backend.repository;

import com.newcafe.backend.entity.song.MusicBoxState;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface MusicBoxStateRepository extends JpaRepository<MusicBoxState, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select state from MusicBoxState state where state.id = 1")
    MusicBoxState findForUpdate();
}
