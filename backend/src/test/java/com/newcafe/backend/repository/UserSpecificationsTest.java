package com.newcafe.backend.repository;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyChar;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;

import org.hibernate.query.criteria.HibernateCriteriaBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class UserSpecificationsTest {

    private Root<User> root;
    private CriteriaBuilder builder;
    private Path<Object> namePath;
    private Path<Object> emailPath;
    private Path<Object> statusPath;
    private Path<Object> rolePath;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        root = mock(Root.class);
        builder = mock(CriteriaBuilder.class);
        namePath = mock(Path.class);
        emailPath = mock(Path.class);
        statusPath = mock(Path.class);
        rolePath = mock(Path.class);

        when(root.get("name")).thenReturn(namePath);
        when(root.get("email")).thenReturn(emailPath);
        when(root.get("status")).thenReturn(statusPath);
        when(root.get("role")).thenReturn(rolePath);
    }

    @Test
    @SuppressWarnings("unchecked")
    void searchesNameAndEmailIgnoringCaseAcrossAllUsers() {
        UserSpecifications.adminSearch("KIM", null, null)
                .toPredicate(root, mock(CriteriaQuery.class), builder);

        verify(builder).lower((Expression<String>) (Expression<?>) namePath);
        verify(builder).lower((Expression<String>) (Expression<?>) emailPath);
        verify(builder, times(2)).like(any(), eq("%kim%"), eq('\\'));
        verify(builder, never()).equal(eq(statusPath), any(Object.class));
        verify(builder, never()).equal(eq(rolePath), any(Object.class));
    }

    @Test
    void combinesStatusAndRoleFilters() {
        UserSpecifications.adminSearch(null, UserStatus.SUSPENDED, UserRole.CUSTOMER)
                .toPredicate(root, mock(CriteriaQuery.class), builder);

        verify(builder).equal(statusPath, UserStatus.SUSPENDED);
        verify(builder).equal(rolePath, UserRole.CUSTOMER);
        verify(builder, never()).like(any(), anyString(), anyChar());
    }

    @Test
    void searchEscapesLikeWildcards() {
        UserSpecifications.adminSearch("50%_off", null, null)
                .toPredicate(root, mock(CriteriaQuery.class), builder);

        verify(builder, times(2)).like(any(), eq("%50\\%\\_off%"), eq('\\'));
    }

    @Test
    @SuppressWarnings("unchecked")
    void ordersByNicknameWithCodePointCollation() {
        HibernateCriteriaBuilder hibernate = mock(HibernateCriteriaBuilder.class);
        CriteriaQuery<User> query = mock(CriteriaQuery.class);
        when(query.getResultType()).thenReturn(User.class);

        UserSpecifications.adminOrder("name").toPredicate(root, query, hibernate);

        verify(hibernate).collate((Expression<String>) (Expression<?>) namePath, "\"C\"");
        verify(query).orderBy(any(), any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void ordersByEmailWhenRequested() {
        HibernateCriteriaBuilder hibernate = mock(HibernateCriteriaBuilder.class);
        CriteriaQuery<User> query = mock(CriteriaQuery.class);
        when(query.getResultType()).thenReturn(User.class);

        UserSpecifications.adminOrder("email").toPredicate(root, query, hibernate);

        verify(hibernate).collate((Expression<String>) (Expression<?>) emailPath, "\"C\"");
    }

    @Test
    @SuppressWarnings("unchecked")
    void countQueryIsNotOrdered() {
        HibernateCriteriaBuilder hibernate = mock(HibernateCriteriaBuilder.class);
        CriteriaQuery<Long> query = mock(CriteriaQuery.class);
        when(query.getResultType()).thenReturn(Long.class);

        UserSpecifications.adminOrder("name").toPredicate(root, query, hibernate);

        verify(query, never()).orderBy(any(), any());
    }
}
