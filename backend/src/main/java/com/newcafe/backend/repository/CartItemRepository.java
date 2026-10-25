package com.newcafe.backend.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.newcafe.backend.entity.cartitem.CartItem;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select item from CartItem item join fetch item.menu where item.userId = :userId and item.id in :ids order by item.id")
    List<CartItem> findOwnedForUpdate(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);

    void deleteAllByIdInBatch(Iterable<Long> ids);

    @EntityGraph(attributePaths = "menu")
    List<CartItem> findAllByUserIdOrderByIdAsc(Long userId);

    @EntityGraph(attributePaths = "menu")
    Optional<CartItem> findByIdAndUserId(Long id, Long userId);

    Optional<CartItem> findByUserIdAndMenu_IdAndTemperature(Long userId, Long menuId, String temperature);

    // 온도 = null 비교는 항상 거짓이므로 온도 없는 줄은 IS NULL로 따로 찾는다.
    Optional<CartItem> findByUserIdAndMenu_IdAndTemperatureIsNull(Long userId, Long menuId);
}
