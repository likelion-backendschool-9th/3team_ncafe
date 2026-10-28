package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.newcafe.backend.config.DemoMenuSeeder;
import com.newcafe.backend.dto.categories.CategoryRequest;
import com.newcafe.backend.dto.categories.CategoryResponse;
import com.newcafe.backend.dto.menus.MenuCreateRequest;
import com.newcafe.backend.dto.menus.MenuResponse;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.service.admin.CategoriesService;
import com.newcafe.backend.service.admin.MenusService;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

// seed 프로필 없이 띄우고 시더를 직접 실행해, 시나리오마다 DB 상태를 바꿔 가며 확인한다.
@SpringBootTest(properties = {
        "spring.config.import=",
        "spring.sql.init.mode=never",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(BackendDatabaseIntegrationTest.DatabaseConfiguration.class)
@ExtendWith(OutputCaptureExtension.class)
@Tag("integration")
class DemoMenuSeederIntegrationTest {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private CategoriesService categoriesService;

    @Autowired
    private MenusService adminMenusService;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private MenuRepository menuRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private DemoMenuSeeder seeder;

    @BeforeEach
    void resetMenusAndCategories() {
        jdbcTemplate.update("DELETE FROM menus");
        jdbcTemplate.update("DELETE FROM categories WHERE is_fallback = false");
        seeder = new DemoMenuSeeder(categoriesService, adminMenusService, categoryRepository, menuRepository);
    }

    @Test
    void s2SeederIsNotRegisteredWithoutSeedProfile() {
        assertTrue(context.getBeansOfType(DemoMenuSeeder.class).isEmpty());
        assertEquals(0, menuRepository.count());
        assertEquals(List.of("기타"), categoryNames());
    }

    @Test
    void s1AndS3SeedsCategoriesAndMenusIntoEmptyDatabase(CapturedOutput output) {
        seeder.run(null);

        assertEquals(List.of("커피", "차", "쥬스", "다과", "세트", "기타"), categoryNames());
        assertEquals(36, menuRepository.count());
        assertTrue(output.getOut().contains("메뉴 시드: 추가 36, 건너뜀 0 []"));
    }

    @Test
    void s4KeepsExistingCategories() {
        CategoryResponse coffee = categoriesService.create(new CategoryRequest("커피"));
        CategoryResponse tea = categoriesService.create(new CategoryRequest("차"));

        seeder.run(null);

        assertEquals(List.of("커피", "차", "쥬스", "다과", "세트", "기타"), categoryNames());
        assertEquals(coffee.id(), categoryId("커피"));
        assertEquals(tea.id(), categoryId("차"));
    }

    @Test
    void s5AndS6CopiesMockValues() {
        seeder.run(null);

        transactionTemplate.executeWithoutResult(status -> {
            Menu coffee = menu("coffee");
            assertEquals("커피", coffee.getName());
            assertEquals(3500, coffee.getPrice());
            assertEquals("커피", coffee.getCategory().getName());
            assertEquals("/images/menus/coffee.jpg", coffee.getImageUrl());
            assertTrue(coffee.isSupportsHot());
            assertTrue(coffee.isSupportsIced());
            assertTrue(coffee.isRecommended());
            assertTrue(coffee.isAvailable());

            assertFalse(menu("fresh-arrowroot-juice").isAvailable());

            Menu monaka = menu("monaka");
            assertFalse(monaka.isSupportsHot());
            assertFalse(monaka.isSupportsIced());
        });
    }

    @Test
    void s8SkipsExistingSlugWithoutOverwriting(CapturedOutput output) {
        Long coffeeCategoryId = categoriesService.create(new CategoryRequest("커피")).id();
        createCoffee(coffeeCategoryId, 4000);

        seeder.run(null);

        assertEquals(4000, menuRepository.findBySlugAndArchivedAtIsNull("coffee").orElseThrow().getPrice());
        assertEquals(36, menuRepository.count());
        assertTrue(output.getOut().contains("메뉴 시드: 추가 35, 건너뜀 1 [coffee]"));
    }

    @Test
    void s9SkipsArchivedSlug() {
        Long coffeeCategoryId = categoriesService.create(new CategoryRequest("커피")).id();
        adminMenusService.delete(createCoffee(coffeeCategoryId, 4000).id());

        seeder.run(null);

        assertTrue(menuRepository.findBySlugAndArchivedAtIsNull("coffee").isEmpty());
        assertEquals(36, menuRepository.count());
    }

    @Test
    void s10RunningTwiceChangesNothing(CapturedOutput output) {
        seeder.run(null);
        seeder.run(null);

        assertEquals(36, menuRepository.count());
        assertEquals(6, categoryRepository.count());
        assertTrue(output.getOut().contains("메뉴 시드: 추가 0, 건너뜀 36"));
    }

    @Test
    void s11NewMenusComeFirstInDefaultPublicOrder() {
        seeder.run(null);

        // 공개 메뉴 목록의 기본 정렬(MenusService.toSort의 default)과 같다.
        List<String> slugs = menuRepository.findAll(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")))
                .stream().map(Menu::getSlug).toList();

        assertEquals(List.of("perilla-seed-tea", "yam-tea", "persimmon-vinegar", "strawberry-juice", "set-jujube",
                "set-boyang", "coffee", "green-tea"), slugs.subList(0, 8));
    }

    private MenuResponse createCoffee(Long categoryId, int price) {
        return adminMenusService.create(new MenuCreateRequest(categoryId, "coffee", "커피", "팀원이 먼저 넣은 커피",
                "/images/menus/coffee.jpg", price, true, false, false, true, false));
    }

    private List<String> categoryNames() {
        return categoriesService.list().stream().map(CategoryResponse::name).toList();
    }

    private Long categoryId(String name) {
        return categoriesService.list().stream().filter(category -> category.name().equals(name))
                .findFirst().orElseThrow().id();
    }

    private Menu menu(String slug) {
        return menuRepository.findBySlugAndArchivedAtIsNull(slug).orElseThrow();
    }
}
