package com.newcafe.backend.repository;

import java.util.Collection;
import java.util.List;

import com.newcafe.backend.entity.cartitem.CartItem;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select item from CartItem item join fetch item.menu where item.userId = :userId and item.id in :ids order by item.id")
    List<CartItem> findOwnedForUpdate(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);

    void deleteAllByIdInBatch(Iterable<Long> ids);
}
