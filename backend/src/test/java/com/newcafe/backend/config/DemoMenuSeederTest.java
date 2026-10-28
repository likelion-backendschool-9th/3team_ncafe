package com.newcafe.backend.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.newcafe.backend.config.DemoMenuSeeder.Mark;
import com.newcafe.backend.config.DemoMenuSeeder.SeedMenu;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.Test;

class DemoMenuSeederTest {

    private static final Path MENU_IMAGES = Path.of("..", "frontend", "public", "images", "menus");

    @Test
    void s7EveryMenuImageExistsInFrontendPublicFolder() {
        List<String> missing = DemoMenuSeeder.MENUS.stream()
                .map(SeedMenu::slug)
                .filter(slug -> !Files.exists(MENU_IMAGES.resolve(slug + ".jpg")))
                .toList();

        assertEquals(36, DemoMenuSeeder.MENUS.size());
        assertTrue(missing.isEmpty(), "이미지 파일이 없는 메뉴: " + missing);
    }

    @Test
    void s11NewMenusAreInsertedLastSoTheyAppearFirst() {
        List<String> slugs = DemoMenuSeeder.insertionOrder().stream().map(SeedMenu::slug).toList().reversed();

        assertEquals(List.of("perilla-seed-tea", "yam-tea", "persimmon-vinegar", "strawberry-juice", "set-jujube",
                "set-boyang", "coffee", "green-tea"), slugs.subList(0, 8));
        assertEquals(6, DemoMenuSeeder.MENUS.stream().filter(menu -> menu.mark() == Mark.NEW).count());
    }
}
