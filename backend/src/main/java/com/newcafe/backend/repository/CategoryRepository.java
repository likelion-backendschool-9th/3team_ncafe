package com.newcafe.backend.repository;

import com.newcafe.backend.entity.category.Category;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findAllByOrderByDisplayOrderAsc();

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);

    @Query("select category from Category category where category.isFallback = true")
    Optional<Category> findFallback();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select category from Category category where category.isFallback = true")
    Optional<Category> findFallbackForUpdate();
}
