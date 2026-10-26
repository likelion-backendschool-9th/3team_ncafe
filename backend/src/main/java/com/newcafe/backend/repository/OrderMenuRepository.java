package com.newcafe.backend.repository;

import java.util.Collection;
import java.util.List;

import com.newcafe.backend.entity.menu.Menu;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderMenuRepository extends JpaRepository<Menu, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select menu from Menu menu where menu.id in :ids order by menu.id")
    List<Menu> findAllForOrderUpdate(@Param("ids") Collection<Long> ids);
}
