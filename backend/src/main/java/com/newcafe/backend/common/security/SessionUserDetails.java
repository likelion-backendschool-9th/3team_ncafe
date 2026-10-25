package com.newcafe.backend.common.security;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public final class SessionUserDetails implements UserDetails, CredentialsContainer {

    private static final long serialVersionUID = 1L;

    private final Long id;
    private final String name;
    private final String email;
    private final UserRole role;
    private final UserStatus status;

    @JsonIgnore
    private transient String passwordHash;

    private SessionUserDetails(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.role = user.getRole();
        this.status = user.getStatus();
        this.passwordHash = user.getPasswordHash();
    }

    public static SessionUserDetails from(User user) {
        return new SessionUserDetails(user);
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public UserRole getRole() {
        return role;
    }

    public UserStatus getStatus() {
        return status;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        String authority = switch (role) {
            case CUSTOMER -> "ROLE_CUSTOMER";
            case ADMIN -> "ROLE_ADMIN";
        };
        return List.of(new SimpleGrantedAuthority(authority));
    }

    @Override
    @JsonIgnore
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isEnabled() {
        return status == UserStatus.ACTIVE;
    }

    @Override
    public void eraseCredentials() {
        passwordHash = null;
    }

    @Override
    public String toString() {
        return "SessionUserDetails[id=" + id + ", role=" + role + "]";
    }
}
