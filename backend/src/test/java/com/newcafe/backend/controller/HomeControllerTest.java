package com.newcafe.backend.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newcafe.backend.common.error.ApiExceptionHandler;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.entity.menu.MenuDetails;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.service.HomeService;

import java.util.List;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class HomeControllerTest {

    private MenuRepository menuRepository;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        menuRepository = org.mockito.Mockito.mock(MenuRepository.class);

        mockMvc = MockMvcBuilders.standaloneSetup(new HomeController(new HomeService(menuRepository)))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void s10RecommendedMenusAreReturned() throws Exception {
        List<Menu> menus = IntStream.range(0, 16).mapToObj(i -> recommendedMenu((long) i + 1)).toList();
        when(menuRepository.findTop16ByAvailableTrueAndRecommendedTrueAndArchivedAtIsNullOrderByCreatedAtDescIdDesc())
                .thenReturn(menus);

        mockMvc.perform(get("/api/v1/index/menus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(16))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].recommended").value(true))
                .andExpect(jsonPath("$[0].available").value(true));
    }

    @Test
    void s11NoRecommendedMenusReturnsEmptyList() throws Exception {
        when(menuRepository.findTop16ByAvailableTrueAndRecommendedTrueAndArchivedAtIsNullOrderByCreatedAtDescIdDesc())
                .thenReturn(List.of());

        mockMvc.perform(get("/api/v1/index/menus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    private static Menu recommendedMenu(Long id) {
        Category category = Category.create("커피", 1);
        ReflectionTestUtils.setField(category, "id", 10L);

        Menu menu = Menu.create(category, "menu-" + id, new MenuDetails(
                "메뉴 " + id, "설명", "/images/menus/coffee.png", 4500, true, false, true, true, true));
        ReflectionTestUtils.setField(menu, "id", id);
        ReflectionTestUtils.invokeMethod(menu, "onCreate");
        return menu;
    }
}
