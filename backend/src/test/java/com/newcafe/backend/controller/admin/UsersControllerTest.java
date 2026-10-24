package com.newcafe.backend.controller.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.error.ApiExceptionHandler;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.entity.user.UserRole;
import com.newcafe.backend.entity.user.UserStatus;
import com.newcafe.backend.repository.UserRepository;
import com.newcafe.backend.repository.UserRepository.StatusCount;
import com.newcafe.backend.service.admin.UsersService;

import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class UsersControllerTest {

    private UserRepository userRepository;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        userRepository = org.mockito.Mockito.mock(UserRepository.class);
        UsersService usersService = new UsersService(userRepository);

        mockMvc = MockMvcBuilders.standaloneSetup(new UsersController(usersService))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void listReturnsFirstPageOfTwentyIncludingAdmins() throws Exception {
        listReturns(20, 25);

        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(20))
                .andExpect(jsonPath("$.items[0].role").value("admin"))
                .andExpect(jsonPath("$.items[1].role").value("customer"))
                .andExpect(jsonPath("$.items[1].name").value("회원1"))
                .andExpect(jsonPath("$.items[1].email").value("user1@ncafe.local"))
                .andExpect(jsonPath("$.items[1].status").value("active"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(25))
                .andExpect(jsonPath("$.totalPages").value(2));

        Pageable pageable = capturedPageable();
        assertEquals(0, pageable.getPageNumber());
        assertEquals(20, pageable.getPageSize());
        assertEquals(Sort.Direction.ASC, pageable.getSort().getOrderFor("name").getDirection());
    }

    @Test
    void listSortsByEmailWhenRequested() throws Exception {
        listReturns(1, 1);

        mockMvc.perform(get("/api/v1/admin/users")
                        .param("q", " 김 ")
                        .param("status", "suspended")
                        .param("role", "customer")
                        .param("sort", "email"))
                .andExpect(status().isOk());

        Sort sort = capturedPageable().getSort();
        assertEquals(Sort.Direction.ASC, sort.getOrderFor("email").getDirection());
        assertEquals(null, sort.getOrderFor("name"));
    }

    @Test
    void listReturnsNextPage() throws Exception {
        listReturns(5, 25);

        mockMvc.perform(get("/api/v1/admin/users").param("page", "1").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(5))
                .andExpect(jsonPath("$.page").value(1));

        assertEquals(1, capturedPageable().getPageNumber());
    }

    @ParameterizedTest
    @ValueSource(strings = {"page=-1", "size=0", "size=101", "page=abc", "status=banned", "role=owner", "sort=newest"})
    void listRejectsInvalidConditions(String query) throws Exception {
        String[] pair = query.split("=");

        mockMvc.perform(get("/api/v1/admin/users").param(pair[0], pair[1]))
                .andExpect(status().isBadRequest());

        verify(userRepository, never()).findAll(anySpecification(), any(Pageable.class));
    }

    @Test
    void listRejectsTooLongQuery() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users").param("q", "가".repeat(101)))
                .andExpect(status().isBadRequest());

        verify(userRepository, never()).findAll(anySpecification(), any(Pageable.class));
    }

    @Test
    void summaryCountsAllActiveAndSuspendedUsers() throws Exception {
        when(userRepository.countByStatus()).thenReturn(List.of(
                statusCount(UserStatus.ACTIVE, 8),
                statusCount(UserStatus.SUSPENDED, 2)));

        mockMvc.perform(get("/api/v1/admin/users/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(10))
                .andExpect(jsonPath("$.activeCount").value(8))
                .andExpect(jsonPath("$.suspendedCount").value(2));
    }

    @Test
    void summaryReturnsZeroWhenNoUsers() throws Exception {
        when(userRepository.countByStatus()).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/admin/users/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(0))
                .andExpect(jsonPath("$.activeCount").value(0))
                .andExpect(jsonPath("$.suspendedCount").value(0));
    }

    @Test
    void getReturnsUserDetail() throws Exception {
        when(userRepository.findById(7L)).thenReturn(Optional.of(user(7L, "고객", UserRole.CUSTOMER)));

        mockMvc.perform(get("/api/v1/admin/users/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.name").value("고객"))
                .andExpect(jsonPath("$.email").value("user7@ncafe.local"))
                .andExpect(jsonPath("$.role").value("customer"))
                .andExpect(jsonPath("$.status").value("active"));
    }

    @Test
    void getMissingUserReturnsNotFound() throws Exception {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/admin/users/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void suspendCustomer() throws Exception {
        User customer = user(7L, "고객", UserRole.CUSTOMER);
        when(userRepository.findById(7L)).thenReturn(Optional.of(customer));

        changeStatus(7L, "suspended")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("suspended"));

        assertEquals(UserStatus.SUSPENDED, customer.getStatus());
    }

    @Test
    void reactivateSuspendedCustomer() throws Exception {
        User customer = user(7L, "고객", UserRole.CUSTOMER);
        customer.changeStatus(UserStatus.SUSPENDED);
        when(userRepository.findById(7L)).thenReturn(Optional.of(customer));

        changeStatus(7L, "active")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("active"));

        assertEquals(UserStatus.ACTIVE, customer.getStatus());
    }

    @ParameterizedTest
    @ValueSource(strings = {"suspended", "active"})
    void adminStatusCannotBeChanged(String status) throws Exception {
        User admin = user(1L, "관리자", UserRole.ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));

        changeStatus(1L, status)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));

        assertEquals(UserStatus.ACTIVE, admin.getStatus());
    }

    @Test
    void changeStatusOfMissingUserReturnsNotFound() throws Exception {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        changeStatus(999L, "suspended").andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{\"status\":\"banned\"}", "{\"status\":\"SUSPENDED\"}", "{}"})
    void changeStatusRejectsInvalidStatus(String body) throws Exception {
        mockMvc.perform(put("/api/v1/admin/users/7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        verify(userRepository, never()).findById(any());
    }

    private ResultActions changeStatus(Long id, String status) throws Exception {
        return mockMvc.perform(put("/api/v1/admin/users/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"" + status + "\"}"));
    }

    private void listReturns(int itemCount, long total) {
        when(userRepository.findAll(anySpecification(), any(Pageable.class))).thenAnswer(invocation -> {
            Pageable pageable = invocation.getArgument(1);
            List<User> users = IntStream.range(0, itemCount)
                    .mapToObj(index -> user((long) index, "회원" + index,
                            index == 0 ? UserRole.ADMIN : UserRole.CUSTOMER))
                    .toList();
            return new PageImpl<>(users, pageable, total);
        });
    }

    private Pageable capturedPageable() {
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(userRepository).findAll(anySpecification(), captor.capture());
        return captor.getValue();
    }

    @SuppressWarnings("unchecked")
    private static Specification<User> anySpecification() {
        return any(Specification.class);
    }

    private static User user(Long id, String name, UserRole role) {
        User user = User.create("User" + id + "@ncafe.local", "hash", name, role);
        ReflectionTestUtils.setField(user, "id", id);
        ReflectionTestUtils.invokeMethod(user, "onCreate");
        return user;
    }

    private static StatusCount statusCount(UserStatus status, long count) {
        return new StatusCount() {
            @Override
            public UserStatus getStatus() {
                return status;
            }

            @Override
            public long getUserCount() {
                return count;
            }
        };
    }
}
