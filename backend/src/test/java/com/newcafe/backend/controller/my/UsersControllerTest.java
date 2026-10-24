package com.newcafe.backend.controller.my;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.error.ApiExceptionHandler;
import com.newcafe.backend.common.security.CurrentUser;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;
import com.newcafe.backend.repository.UserRepository;
import com.newcafe.backend.service.my.UsersService;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class UsersControllerTest {

    private static final Long CURRENT_USER_ID = 7L;

    private UserRepository userRepository;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        userRepository = org.mockito.Mockito.mock(UserRepository.class);
        UsersService usersService = new UsersService(userRepository);

        mockMvc = MockMvcBuilders.standaloneSetup(new UsersController(usersService, new CurrentUser(CURRENT_USER_ID)))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void returnsCurrentCustomer() throws Exception {
        when(userRepository.findById(CURRENT_USER_ID)).thenReturn(Optional.of(user(UserRole.CUSTOMER)));

        mockMvc.perform(get("/api/v1/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.name").value("고객"))
                .andExpect(jsonPath("$.email").value("customer@ncafe.local"))
                .andExpect(jsonPath("$.role").value("customer"))
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void adminCanReadOwnInfo() throws Exception {
        when(userRepository.findById(CURRENT_USER_ID)).thenReturn(Optional.of(user(UserRole.ADMIN)));

        mockMvc.perform(get("/api/v1/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("admin"));
    }

    @Test
    void missingUserIsUnauthorized() throws Exception {
        when(userRepository.findById(CURRENT_USER_ID)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/my"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void suspendedUserIsForbidden() throws Exception {
        User suspended = user(UserRole.CUSTOMER);
        suspended.changeStatus(UserStatus.SUSPENDED);
        when(userRepository.findById(CURRENT_USER_ID)).thenReturn(Optional.of(suspended));

        mockMvc.perform(get("/api/v1/my"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    private static User user(UserRole role) {
        String name = role == UserRole.ADMIN ? "관리자" : "고객";
        User user = User.create(role.value() + "@ncafe.local", "hash", name, role);
        ReflectionTestUtils.setField(user, "id", CURRENT_USER_ID);
        ReflectionTestUtils.invokeMethod(user, "onCreate");
        return user;
    }
}
