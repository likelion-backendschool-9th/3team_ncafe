package com.newcafe.backend.config;

import com.newcafe.backend.dto.categories.CategoryRequest;
import com.newcafe.backend.dto.categories.CategoryResponse;
import com.newcafe.backend.dto.menus.MenuCreateRequest;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.service.admin.CategoriesService;
import com.newcafe.backend.service.admin.MenusService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

// 발표 시연용 카테고리·메뉴를 프론트 목업(frontend/app/_lib/mock/menus.ts) 값으로 채운다.
// seed 프로필에서만 실행하며, 이미 있는 카테고리 이름과 메뉴 slug는 건드리지 않는다.
@Slf4j
@Component
@Profile("seed")
@RequiredArgsConstructor
public class DemoMenuSeeder implements ApplicationRunner {

    static final List<String> CATEGORY_NAMES = List.of("커피", "차", "쥬스", "다과", "세트");

    // 목업 배열 순서 그대로. 공개 목록(최근 등록순)에서는 첫 개시 메뉴가 맨 앞, 나머지가 이 순서로 보인다.
    static final List<SeedMenu> MENUS = List.of(
            menu("coffee", "커피", "커피", 3500, Temperature.BOTH, Mark.RECOMMENDED, "커피 둘, 설탕 둘, 프림 둘. 그 시절 다방 그대로의 달달한 커피"),
            menu("green-tea", "녹차", "차", 4000, Temperature.BOTH, Mark.NONE, "은은한 향과 쌉싸름한 끝맛의 맑은 녹차"),
            menu("black-tea", "홍차", "차", 4000, Temperature.BOTH, Mark.NONE, "레몬 한 조각 띄운 진하고 향긋한 홍차"),
            menu("arrowroot-tea", "칡차", "차", 4500, Temperature.HOT, Mark.NONE, "말린 칡뿌리를 오래 달여 구수하고 깊은 맛"),
            menu("jobs-tears-tea", "율무차", "차", 4000, Temperature.HOT, Mark.NONE, "고소하고 걸쭉한 율무차에 견과를 솔솔 뿌려 드려요"),
            menu("sansuyu", "산수유", "차", 5000, Temperature.HOT, Mark.NONE, "붉은 산수유 열매를 달여 새콤하고 개운한 차"),
            menu("solomons-seal-tea", "둥굴레차", "차", 3500, Temperature.BOTH, Mark.NONE, "볶은 둥굴레를 우려낸 구수하고 편안한 차"),
            menu("yuja-tea", "유자차", "차", 4500, Temperature.BOTH, Mark.RECOMMENDED, "직접 담근 유자청을 듬뿍 넣은 새콤달콤한 유자차"),
            menu("ginger-tea", "생강차", "차", 4500, Temperature.HOT, Mark.NONE, "알싸하고 따뜻한 국산 생강을 우려낸 차"),
            menu("perilla-seed-tea", "들깨차", "차", 5000, Temperature.HOT, Mark.NEW, "볶은 들깨를 곱게 갈아 넣은 진하고 고소한 차"),
            menu("ginseng-tea", "인삼차", "차", 5500, Temperature.HOT, Mark.NONE, "쌉싸름한 인삼 향이 그윽한 기운 나는 차"),
            menu("arrowroot-juice", "칡즙", "차", 5000, Temperature.ICED, Mark.NONE, "쌉싸름한 뒷맛이 개운한 국산 칡즙"),
            menu("fresh-arrowroot-juice", "생칡즙", "차", 6000, Temperature.ICED, Mark.SOLD_OUT, "그날 짜낸 생칡을 그대로 담은 진한 생칡즙"),
            menu("ssanghwacha", "쌍화차", "차", 6000, Temperature.HOT, Mark.RECOMMENDED, "노른자 동동 띄우고 잣·대추 듬뿍 올린 다방 쌍화차"),
            menu("honey-tea", "벌꿀차", "차", 4000, Temperature.BOTH, Mark.NONE, "토종 벌꿀을 따끈하게 풀어낸 달콤한 꿀차"),
            menu("jujube-tea", "대추차", "차", 5500, Temperature.HOT, Mark.RECOMMENDED, "대추를 푹 고아 걸쭉하게 내린 달큰한 대추차"),
            menu("yam-tea", "마차", "차", 5000, Temperature.BOTH, Mark.NEW, "곱게 간 마에 우유와 꿀을 더한 부드러운 마차"),
            menu("mugwort-tea", "쑥차", "차", 4000, Temperature.HOT, Mark.NONE, "봄 쑥을 덖어 우린 향긋하고 쌉쌀한 쑥차"),
            menu("ginkgo-tea", "은행차", "차", 5000, Temperature.HOT, Mark.NONE, "구운 은행을 띄운 고소하고 따뜻한 은행차"),
            menu("cocoa", "코코아", "차", 4000, Temperature.BOTH, Mark.NONE, "진한 코코아에 우유를 듬뿍 넣은 달콤한 한 잔"),
            menu("milk", "우유", "쥬스", 3000, Temperature.BOTH, Mark.NONE, "고소한 생우유 한 잔, 따뜻하게도 시원하게도"),
            menu("persimmon-vinegar", "감식초", "쥬스", 4500, Temperature.ICED, Mark.NEW, "오래 숙성한 감식초를 시원하게 타낸 새콤한 음료"),
            menu("orange-juice", "오렌지 쥬스", "쥬스", 4500, Temperature.ICED, Mark.NONE, "유리잔에 얼음 동동, 새콤달콤 오렌지 쥬스"),
            menu("maesil-juice", "매실 쥬스", "쥬스", 4500, Temperature.ICED, Mark.RECOMMENDED, "직접 담근 매실청으로 만든 상큼한 매실 쥬스"),
            menu("tomato-juice", "토마토 쥬스", "쥬스", 4500, Temperature.ICED, Mark.NONE, "잘 익은 토마토를 통째로 갈아낸 건강한 쥬스"),
            menu("strawberry-juice", "딸기 쥬스", "쥬스", 5000, Temperature.ICED, Mark.NEW, "생딸기를 듬뿍 갈아 넣은 달콤한 딸기 쥬스"),
            menu("monaka", "모나카", "다과", 3000, Temperature.NONE, Mark.NONE, "바삭한 찹쌀 과자 속에 달콤한 팥앙금을 채운 모나카"),
            menu("castella", "카스테라", "다과", 4000, Temperature.NONE, Mark.RECOMMENDED, "촉촉하고 폭신한 옛날 카스테라 한 조각"),
            menu("fried-egg", "계란 후라이", "다과", 2000, Temperature.NONE, Mark.NONE, "노른자를 살짝 익힌 반숙 계란 후라이, 모닝커피와 함께"),
            menu("sesame-porridge", "깨죽", "다과", 5500, Temperature.HOT, Mark.NONE, "검은깨를 곱게 갈아 쑨 고소한 깨죽"),
            menu("set-morning", "모닝커피 세트", "세트", 5000, Temperature.BOTH, Mark.RECOMMENDED, "커피 + 계란 후라이. 다방의 아침을 여는 단골 조합"),
            menu("set-ssanghwa", "쌍화차 세트", "세트", 8500, Temperature.HOT, Mark.NONE, "쌍화차 + 모나카. 진한 쌍화차에 달콤한 모나카 한 입"),
            menu("set-jujube", "대추차 세트", "세트", 9000, Temperature.HOT, Mark.NEW, "대추차 + 카스테라. 달큰한 대추차와 폭신한 카스테라"),
            menu("set-yuja", "유자차 세트", "세트", 9500, Temperature.BOTH, Mark.NONE, "유자차 + 깨죽. 든든한 깨죽 한 그릇에 상큼한 유자차"),
            menu("set-strawberry", "딸기 쥬스 세트", "세트", 8500, Temperature.ICED, Mark.NONE, "딸기 쥬스 + 카스테라. 달콤한 오후의 간식 한 상"),
            menu("set-boyang", "든든 보양 세트", "세트", 9500, Temperature.HOT, Mark.NEW, "계란 후라이 + 깨죽 + 쌍화탕. 속을 든든히 채우는 보양 한 상")
    );

    private final CategoriesService categoriesService;
    private final MenusService adminMenusService;
    private final CategoryRepository categoryRepository;
    private final MenuRepository menuRepository;

    @Override
    public void run(ApplicationArguments args) {
        seedCategories();
        seedMenus();
    }

    private void seedCategories() {
        categoriesService.initializeFallback();
        for (String name : CATEGORY_NAMES) {
            if (!categoryRepository.existsByName(name)) {
                categoriesService.create(new CategoryRequest(name));
            }
        }
    }

    private void seedMenus() {
        Map<String, Long> categoryIds = categoriesService.list().stream()
                .collect(Collectors.toMap(CategoryResponse::name, CategoryResponse::id));
        List<String> skipped = new ArrayList<>();
        int added = 0;
        for (SeedMenu menu : insertionOrder()) {
            if (menuRepository.existsBySlug(menu.slug())) {
                skipped.add(menu.slug());
                continue;
            }
            adminMenusService.create(menu.toRequest(categoryIds.get(menu.category())));
            added++;
        }
        log.info("메뉴 시드: 추가 {}, 건너뜀 {} {}", added, skipped.size(), skipped);
    }

    // 최근 등록순으로 보이므로 마지막에 넣은 메뉴가 맨 앞에 온다. 첫 개시가 아닌 메뉴, 첫 개시 메뉴 순으로 각각 거꾸로 넣는다.
    static List<SeedMenu> insertionOrder() {
        return Stream.concat(
                MENUS.stream().filter(menu -> menu.mark() != Mark.NEW).toList().reversed().stream(),
                MENUS.stream().filter(menu -> menu.mark() == Mark.NEW).toList().reversed().stream()
        ).toList();
    }

    private static SeedMenu menu(String slug, String name, String category, int price, Temperature temperature,
            Mark mark, String description) {
        return new SeedMenu(slug, name, category, price, temperature, mark, description);
    }

    enum Temperature { HOT, ICED, BOTH, NONE }

    // 목업에서 한 메뉴가 둘 이상을 겸하는 경우는 없다.
    enum Mark { NONE, NEW, RECOMMENDED, SOLD_OUT }

    record SeedMenu(String slug, String name, String category, int price, Temperature temperature, Mark mark,
            String description) {

        String imageUrl() {
            return "/images/menus/" + slug + ".jpg";
        }

        MenuCreateRequest toRequest(Long categoryId) {
            return new MenuCreateRequest(categoryId, slug, name, description, imageUrl(), price,
                    mark != Mark.SOLD_OUT, mark == Mark.NEW, mark == Mark.RECOMMENDED,
                    temperature == Temperature.HOT || temperature == Temperature.BOTH,
                    temperature == Temperature.ICED || temperature == Temperature.BOTH);
        }
    }
}
