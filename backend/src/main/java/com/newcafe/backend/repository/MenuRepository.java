package com.newcafe.backend.repository;

import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.entity.menu.Menu;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MenuRepository extends JpaRepository<Menu, Long> {

    interface CategoryMenuCount {
        Long getCategoryId();

        long getMenuCount();
    }

    long countByCategory_Id(Long categoryId);

    @Query("select menu.category.id as categoryId, count(menu) as menuCount from Menu menu group by menu.category.id")
    List<CategoryMenuCount> countByCategory();

    @Modifying(flushAutomatically = true)
    @Query("update Menu menu set menu.category = :fallback where menu.category = :removed")
    int moveToCategory(@Param("removed") Category removed, @Param("fallback") Category fallback);
}
