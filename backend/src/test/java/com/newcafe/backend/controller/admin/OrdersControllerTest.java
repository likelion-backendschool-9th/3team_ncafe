package com.newcafe.backend.controller.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.newcafe.backend.common.error.ApiExceptionHandler;
import com.newcafe.backend.common.error.AdminOrdersExceptionHandler;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.entity.menu.MenuDetails;
import com.newcafe.backend.entity.order.Order;
import com.newcafe.backend.entity.order.OrderItem;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.repository.OrderRepository;
import com.newcafe.backend.service.admin.OrdersService;

import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class OrdersControllerTest {
    private static final String BODY = """
            {"id":1,"expectedStatus":"received","statusVersion":0,"nextStatus":"preparing"}
            """;
    private OrderRepository repository;
    private MockMvc mvc;
    private Order order;

    @BeforeEach
    void setup() {
        repository = mock(OrderRepository.class);
        mvc = MockMvcBuilders.standaloneSetup(new OrdersController(new OrdersService(repository)))
                .setControllerAdvice(new ApiExceptionHandler(), new AdminOrdersExceptionHandler()).build();
        Menu menu = Menu.create(Category.create("차", 1), "tea", new MenuDetails("쌍화차", "설명",
                "/images/menus/tea.png", 5000, true, false, false, true, false));
        ReflectionTestUtils.setField(menu, "id", 10L);
        order = Order.create(2L, "손님", "dine-in", "card", "덜 뜨겁게", 10000, "admin-test", "test-fingerprint");
        order.addItem(OrderItem.snapshot(menu, "hot", 2, 5000, 10000));
        ReflectionTestUtils.setField(order, "id", 1L);
        ReflectionTestUtils.setField(order, "statusVersion", 0);
        ReflectionTestUtils.invokeMethod(order, "onCreate");
        when(repository.findWithItemsById(1L)).thenReturn(Optional.of(order));
    }

    private RequestPostProcessor admin() {
        return request -> {
            request.setUserPrincipal(() -> "admin-user");
            request.addUserRole("ADMIN");
            return request;
        };
    }

    @Test
    void lowercaseRoleDoesNotMatchAuthenticationBranchAdminAuthority() throws Exception {
        mvc.perform(get("/api/v1/admin/orders/1").with(request -> {
            request.setUserPrincipal(() -> "admin-user");
            request.addUserRole("admin");
            return request;
        })).andExpect(status().isForbidden());
        verifyNoInteractions(repository);
    }

    @Test
    void unauthenticatedAndCustomerCannotReadOrChangeOrders() throws Exception {
        for (var request : List.of(get("/api/v1/admin/orders"), get("/api/v1/admin/orders/1"),
                put("/api/v1/admin/orders/status").contentType(MediaType.APPLICATION_JSON).content(BODY))) {
            mvc.perform(request).andExpect(status().isUnauthorized());
            mvc.perform(request.principal(() -> "customer"))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }
        verifyNoInteractions(repository);
    }

    @Test
    void detailContainsSnapshotNumericIdsAndVersion() throws Exception {
        mvc.perform(get("/api/v1/admin/orders/1").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1)).andExpect(jsonPath("$.customerId").value(2))
                .andExpect(jsonPath("$.customerName").value("손님"))
                .andExpect(jsonPath("$.orderType").value("dine-in"))
                .andExpect(jsonPath("$.paymentMethod").value("card"))
                .andExpect(jsonPath("$.request").value("덜 뜨겁게"))
                .andExpect(jsonPath("$.items[0].menuName").value("쌍화차"))
                .andExpect(jsonPath("$.items[0].menuId").value(10))
                .andExpect(jsonPath("$.items[0].temperature").value("hot"))
                .andExpect(jsonPath("$.totalAmount").value(10000))
                .andExpect(jsonPath("$.statusVersion").value(0))
                .andExpect(jsonPath("$.allowedStatuses[1]").value("canceled"))
                .andExpect(jsonPath("$.createdAt").exists());
    }

    @Test
    @SuppressWarnings("unchecked")
    void listPaginatesBeforeLoadingItemsAndPreservesSort() throws Exception {
        when(repository.findAll(any(Specification.class), any(Pageable.class))).thenAnswer(call -> {
            Pageable page = call.getArgument(1);
            assertEquals(1, page.getPageNumber());
            assertEquals(Sort.by(Sort.Direction.ASC, "createdAt", "id"), page.getSort());
            return new PageImpl<>(List.of(order), page, 21);
        });
        when(repository.findWithItemsByIdIn(List.of(1L))).thenReturn(List.of(order));
        mvc.perform(get("/api/v1/admin/orders").param("page", "1").param("sort", "oldest").with(admin()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(1))
                .andExpect(jsonPath("$.page").value(1)).andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(21)).andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    @SuppressWarnings("unchecked")
    void emptyListDoesNotFetchItems() throws Exception {
        when(repository.findAll(any(Specification.class), any(Pageable.class))).thenAnswer(call ->
                new PageImpl<>(List.of(), call.getArgument(1), 0));
        mvc.perform(get("/api/v1/admin/orders").with(admin()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        verify(repository, never()).findWithItemsByIdIn(any());
    }

    @Test
    void statusChangeFlushesAndReturnsNewVersion() throws Exception {
        doAnswer(call -> { ReflectionTestUtils.setField(order, "statusVersion", 1); return null; })
                .when(repository).flush();
        mvc.perform(put("/api/v1/admin/orders/status").with(admin()).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("preparing"))
                .andExpect(jsonPath("$.statusVersion").value(1));
        verify(repository).flush();
    }

    @Test
    void receivedCanBeCanceledWithoutReason() throws Exception {
        mvc.perform(put("/api/v1/admin/orders/status").with(admin()).contentType(MediaType.APPLICATION_JSON)
                        .content(BODY.replace("\"nextStatus\":\"preparing\"", "\"nextStatus\":\"canceled\"")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("canceled"))
                .andExpect(jsonPath("$.allowedStatuses").isEmpty());
    }

    @Test
    void staleStatusVersionAndInvalidTransitionReturnConflict() throws Exception {
        for (String body : List.of(BODY.replace("\"statusVersion\":0", "\"statusVersion\":1"),
                BODY.replace("\"expectedStatus\":\"received\"", "\"expectedStatus\":\"ready\""),
                BODY.replace("\"nextStatus\":\"preparing\"", "\"nextStatus\":\"completed\""))) {
            mvc.perform(put("/api/v1/admin/orders/status").with(admin()).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isConflict());
        }
        verify(repository, never()).flush();
    }

    @Test
    void concurrentFlushConflictUsesSameErrorAsStaleRequest() throws Exception {
        doThrow(new ObjectOptimisticLockingFailureException(Order.class, 1L)).when(repository).flush();
        mvc.perform(put("/api/v1/admin/orders/status").with(admin()).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_STATUS"));
    }

    @Test
    void missingOrderReturnsNotFoundForReadAndWrite() throws Exception {
        mvc.perform(get("/api/v1/admin/orders/99").with(admin())).andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/admin/orders/status").with(admin()).contentType(MediaType.APPLICATION_JSON)
                .content(BODY.replace("\"id\":1", "\"id\":99"))).andExpect(status().isNotFound());
    }

    static Stream<String> invalidQueries() {
        return Stream.of("page=-1", "size=0", "size=101", "status=unknown", "sort=price", "group=unknown", "q=" + "가".repeat(101));
    }

    @ParameterizedTest
    @MethodSource("invalidQueries")
    void invalidQueryReturnsBadRequest(String query) throws Exception {
        String[] pair = query.split("=", 2);
        mvc.perform(get("/api/v1/admin/orders").param(pair[0], pair[1]).with(admin()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(repository);
    }

    static Stream<String> invalidBodies() {
        return Stream.of(BODY.replace("\"id\":1,", ""), BODY.replace("\"statusVersion\":0,", ""),
                BODY.replace("\"statusVersion\":0", "\"statusVersion\":-1"),
                BODY.replace("\"expectedStatus\":\"received\",", ""),
                BODY.replace("\"nextStatus\":\"preparing\"", "\"nextStatus\":\"unknown\""));
    }

    @ParameterizedTest
    @MethodSource("invalidBodies")
    void invalidBodyCannotModifyOrder(String body) throws Exception {
        mvc.perform(put("/api/v1/admin/orders/status").with(admin()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(repository);
    }
}
