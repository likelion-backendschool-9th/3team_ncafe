package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Category;
import com.newcafe.backend.entity.Menu;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MenuRepository extends JpaRepository<Menu, Long> {

    long countByCategory_Id(Long categoryId);

    @Modifying(flushAutomatically = true)
    @Query("update Menu menu set menu.category = :fallback where menu.category = :removed")
    int moveToCategory(@Param("removed") Category removed, @Param("fallback") Category fallback);
}
