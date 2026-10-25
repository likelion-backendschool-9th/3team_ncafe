package com.newcafe.backend.controller.my;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.error.ApiExceptionHandler;
import com.newcafe.backend.common.error.CartItemException;
import com.newcafe.backend.common.error.CartItemException.Reason;
import com.newcafe.backend.common.security.SessionUserDetails;
import com.newcafe.backend.dto.cartitems.CartItemRequest;
import com.newcafe.backend.dto.cartitems.CartItemResponse;
import com.newcafe.backend.entity.user.User;
import com.newcafe.backend.service.my.CartItemsService;

import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

// 접근 정책(401·403)은 ApiAccessPolicyTest가 SecurityConfig와 함께 확인한다. 여기서는 로그인 회원이 있다고 보고 요청·응답만 본다.
class CartItemsControllerTest {

    private static final Long MEMBER_ID = 42L;

    private CartItemsService cartItemsService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        cartItemsService = mock(CartItemsService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new CartItemsController(cartItemsService))
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
        signIn();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void s1NewLineReturnsCreatedForSignedInMember() throws Exception {
        when(cartItemsService.add(eq(MEMBER_ID), eq(1L), any(CartItemRequest.class)))
                .thenReturn(new CartItemsService.Added(line(11L, "iced", 2), true));

        mockMvc.perform(post("/api/v1/menus/1/cart/items").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"temperature\":\"iced\",\"quantity\":2}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(11))
                .andExpect(jsonPath("$.menuId").value(1))
                .andExpect(jsonPath("$.slug").value("coffee"))
                .andExpect(jsonPath("$.temperature").value("iced"))
                .andExpect(jsonPath("$.quantity").value(2))
                .andExpect(jsonPath("$.lineTotal").value(7000))
                .andExpect(jsonPath("$.orderable").value(true));

        verify(cartItemsService).add(MEMBER_ID, 1L, new CartItemRequest("iced", 2));
    }

    @Test
    void s2MergedLineReturnsOk() throws Exception {
        when(cartItemsService.add(eq(MEMBER_ID), eq(1L), any(CartItemRequest.class)))
                .thenReturn(new CartItemsService.Added(line(11L, "iced", 20), false));

        mockMvc.perform(post("/api/v1/menus/1/cart/items").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"temperature\":\"iced\",\"quantity\":19}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantity").value(20));
    }

    @Test
    void s3NullTemperatureIsAccepted() throws Exception {
        when(cartItemsService.add(eq(MEMBER_ID), eq(8L), any(CartItemRequest.class)))
                .thenReturn(new CartItemsService.Added(line(12L, null, 1), true));

        mockMvc.perform(post("/api/v1/menus/8/cart/items").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"temperature\":null,\"quantity\":1}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.temperature").doesNotExist());
    }

    static Stream<String> invalidAddBodies() {
        return Stream.of(
                "{\"temperature\":\"iced\",\"quantity\":0}",
                "{\"temperature\":\"iced\",\"quantity\":21}",
                "{\"temperature\":\"iced\"}",
                "{\"temperature\":\"warm\",\"quantity\":1}");
    }

    @ParameterizedTest
    @MethodSource("invalidAddBodies")
    void s4InvalidBodyReturnsBadRequestWithoutCallingService(String body) throws Exception {
        mockMvc.perform(post("/api/v1/menus/1/cart/items").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        verifyNoInteractions(cartItemsService);
    }

    @Test
    void s4TemperatureMismatchFromServiceReturnsBadRequest() throws Exception {
        when(cartItemsService.add(eq(MEMBER_ID), eq(8L), any(CartItemRequest.class)))
                .thenThrow(new CartItemException(Reason.INVALID_INPUT, "이 메뉴에서 선택할 수 없는 온도입니다."));

        mockMvc.perform(post("/api/v1/menus/8/cart/items").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"temperature\":\"hot\",\"quantity\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void s5MissingMenuIsNotFoundAndSoldOutIsUnprocessable() throws Exception {
        when(cartItemsService.add(eq(MEMBER_ID), eq(999L), any(CartItemRequest.class)))
                .thenThrow(new CartItemException(Reason.NOT_FOUND, "메뉴를 찾을 수 없습니다."));
        when(cartItemsService.add(eq(MEMBER_ID), eq(2L), any(CartItemRequest.class)))
                .thenThrow(new CartItemException(Reason.MENU_UNAVAILABLE, "판매 중지된 메뉴는 담을 수 없습니다."));

        mockMvc.perform(post("/api/v1/menus/999/cart/items").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"temperature\":\"iced\",\"quantity\":1}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc.perform(post("/api/v1/menus/2/cart/items").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"temperature\":\"iced\",\"quantity\":1}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("MENU_UNAVAILABLE"));
    }

    static CartItemResponse line(Long id, String temperature, int quantity) {
        return new CartItemResponse(id, 1L, "coffee", "커피", "/images/menus/coffee.jpg", 3500,
                temperature, quantity, 3500 * quantity, true);
    }

    private static void signIn() {
        User user = User.createCustomer("테스트 회원", "member@example.com", "{bcrypt}$2a$10$" + "a".repeat(53));
        ReflectionTestUtils.setField(user, "id", MEMBER_ID);
        SessionUserDetails principal = SessionUserDetails.forSession(user);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                principal, null, principal.getAuthorities()));
        SecurityContextHolder.setContext(context);
    }
}
