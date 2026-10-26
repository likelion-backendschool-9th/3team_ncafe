package com.newcafe.backend.repository;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyChar;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.newcafe.backend.entity.menu.Menu;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MenuSpecificationsTest {

    private Root<Menu> root;
    private CriteriaBuilder builder;
    private Path<Object> categoryPath;
    private Path<Object> categoryIdPath;
    private Path<Object> availablePath;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        root = mock(Root.class);
        builder = mock(CriteriaBuilder.class);
        categoryPath = mock(Path.class);
        categoryIdPath = mock(Path.class);
        availablePath = mock(Path.class);

        when(root.get("category")).thenReturn(categoryPath);
        when(categoryPath.get("id")).thenReturn(categoryIdPath);
        when(root.get("available")).thenReturn(availablePath);
    }

    @Test
    void s8CombinesNameCategoryAndStatusFilters() {
        MenuSpecifications.adminSearch("라떼", 10L, false)
                .toPredicate(root, mock(CriteriaQuery.class), builder);

        verify(builder).isNull(root.get("archivedAt"));
        verify(builder, times(2)).like(any(), eq("%라떼%"), eq('\\'));
        verify(builder).equal(categoryIdPath, 10L);
        verify(builder).equal(availablePath, false);
    }

    @Test
    @SuppressWarnings("unchecked")
    void s9SearchIgnoresCaseOnNameAndSlug() {
        Path<Object> namePath = mock(Path.class);
        Path<Object> slugPath = mock(Path.class);
        when(root.get("name")).thenReturn(namePath);
        when(root.get("slug")).thenReturn(slugPath);

        MenuSpecifications.adminSearch("AMERI", null, null)
                .toPredicate(root, mock(CriteriaQuery.class), builder);

        verify(builder).lower((Expression<String>) (Expression<?>) namePath);
        verify(builder).lower((Expression<String>) (Expression<?>) slugPath);
        verify(builder, times(2)).like(any(), eq("%ameri%"), eq('\\'));
        verify(builder, never()).equal(eq(categoryIdPath), any(Object.class));
    }

    @Test
    void searchEscapesLikeWildcards() {
        MenuSpecifications.adminSearch("50%_off", null, null)
                .toPredicate(root, mock(CriteriaQuery.class), builder);

        verify(builder, times(2)).like(any(), eq("%50\\%\\_off%"), eq('\\'));
    }

    @Test
    void publicS1AlwaysExcludesArchivedMenus() {
        MenuSpecifications.publicSearch(null, null, null)
                .toPredicate(root, mock(CriteriaQuery.class), builder);

        verify(builder).isNull(root.get("archivedAt"));
        verify(builder, never()).like(any(), any(String.class), anyChar());
        verify(builder, never()).equal(eq(categoryIdPath), any(Object.class));
        verify(builder, never()).equal(eq(availablePath), any(Object.class));
    }

    @Test
    void publicS2CombinesNameAndCategoryFilters() {
        MenuSpecifications.publicSearch("라떼", 10L, null)
                .toPredicate(root, mock(CriteriaQuery.class), builder);

        verify(builder).isNull(root.get("archivedAt"));
        verify(builder, times(2)).like(any(), eq("%라떼%"), eq('\\'));
        verify(builder).equal(categoryIdPath, 10L);
        verify(builder, never()).equal(eq(availablePath), any(Object.class));
    }
}
