package com.newcafe.backend.controller.admin;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.error.ApiExceptionHandler;
import com.newcafe.backend.common.security.ApiLogoutSuccessHandler;
import com.newcafe.backend.common.security.DatabaseUserDetailsService;
import com.newcafe.backend.common.security.LoginSuccessHandler;
import com.newcafe.backend.common.security.Passwords;
import com.newcafe.backend.common.security.SecurityErrorHandler;
import com.newcafe.backend.common.security.SessionCookieLogoutHandler;
import com.newcafe.backend.common.security.SessionMemberService;
import com.newcafe.backend.common.security.SessionUserDetails;
import com.newcafe.backend.common.security.WithSessionUser;
import com.newcafe.backend.config.PasswordConfig;
import com.newcafe.backend.config.SecurityConfig;
import com.newcafe.backend.entity.order.Order;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.repository.OrderRepository;
import com.newcafe.backend.repository.SongRepository;
import com.newcafe.backend.repository.UserRepository;
import com.newcafe.backend.service.admin.HomeService;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(HomeController.class)
@Import({SecurityConfig.class, SecurityErrorHandler.class, LoginSuccessHandler.class, PasswordConfig.class,
        Passwords.class, DatabaseUserDetailsService.class, ApiLogoutSuccessHandler.class,
        SessionCookieLogoutHandler.class, ApiExceptionHandler.class, HomeService.class})
@WithSessionUser(role = UserRole.ADMIN)
class HomeControllerTest {

    @MockitoBean
    private SessionMemberService sessionMembers;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private MenuRepository menuRepository;

    @MockitoBean
    private OrderRepository orderRepository;

    @MockitoBean
    private SongRepository songRepository;

    @Autowired
    private MockMvc mockMvc;

    @BeforeEach
    void currentSessionMember() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof SessionUserDetails member) {
            when(sessionMembers.findById(member.getId())).thenReturn(Optional.of(member));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"menus", "orders", "songs"})
    @WithAnonymousUser
    void anonymousCannotReadSummaries(String section) throws Exception {
        mockMvc.perform(get("/api/v1/admin/index/" + section))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        verifyNoInteractions(menuRepository, orderRepository, songRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"menus", "orders", "songs"})
    @WithSessionUser(role = UserRole.CUSTOMER)
    void customerCannotReadSummaries(String section) throws Exception {
        mockMvc.perform(get("/api/v1/admin/index/" + section))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        verifyNoInteractions(menuRepository, orderRepository, songRepository);
    }

    @Test
    void menuSummaryCountsVisibleMenusByAvailability() throws Exception {
        when(menuRepository.countByArchivedAtIsNull()).thenReturn(12L);
        when(menuRepository.countByAvailableTrueAndArchivedAtIsNull()).thenReturn(9L);

        mockMvc.perform(get("/api/v1/admin/index/menus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(12))
                .andExpect(jsonPath("$.availableCount").value(9))
                .andExpect(jsonPath("$.unavailableCount").value(3));
    }

    @Test
    void menuSummaryReturnsZeroWhenNoMenus() throws Exception {
        mockMvc.perform(get("/api/v1/admin/index/menus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(0))
                .andExpect(jsonPath("$.availableCount").value(0))
                .andExpect(jsonPath("$.unavailableCount").value(0));
    }

    @Test
    void orderSummaryCountsActiveOrders() throws Exception {
        when(orderRepository.countByStatusIn(Order.ACTIVE_STATUSES)).thenReturn(4L);

        mockMvc.perform(get("/api/v1/admin/index/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeCount").value(4));
    }

    @Test
    void songSummaryCountsPendingSongs() throws Exception {
        when(songRepository.countByStatus(SongStatus.pending)).thenReturn(2L);

        mockMvc.perform(get("/api/v1/admin/index/songs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingCount").value(2));
    }
}
