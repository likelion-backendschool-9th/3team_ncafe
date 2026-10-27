package com.newcafe.backend.service.admin;

import com.newcafe.backend.common.error.MenuException;
import com.newcafe.backend.common.error.MenuException.Reason;
import com.newcafe.backend.dto.menus.MenuCreateRequest;
import com.newcafe.backend.dto.menus.MenuPageResponse;
import com.newcafe.backend.dto.menus.MenuResponse;
import com.newcafe.backend.dto.menus.MenuSearchRequest;
import com.newcafe.backend.dto.menus.MenuSummaryResponse;
import com.newcafe.backend.dto.menus.MenuUpdateRequest;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.entity.menu.Menu;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.repository.MenuSpecifications;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("adminMenusService")
@RequiredArgsConstructor
public class MenusService {

    private final MenuRepository menuRepository;
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public MenuPageResponse list(MenuSearchRequest request) {
        PageRequest pageRequest = PageRequest.of(request.page(), request.size(), toSort(request.sort()));

        return MenuPageResponse.from(menuRepository.findAll(
                MenuSpecifications.adminSearch(request.q(), request.categoryId(), request.available()), pageRequest));
    }

    // 목록과 같이 삭제(숨김)한 메뉴는 세지 않는다.
    @Transactional(readOnly = true)
    public MenuSummaryResponse summary() {
        long total = menuRepository.countByArchivedAtIsNull();
        long available = menuRepository.countByAvailableTrueAndArchivedAtIsNull();

        return new MenuSummaryResponse(total, available, total - available);
    }

    @Transactional(readOnly = true)
    public MenuResponse get(Long id) {
        return MenuResponse.from(findMenu(id));
    }

    @Transactional
    public MenuResponse create(MenuCreateRequest request) {
        Category category = findCategory(request.categoryId());

        if (menuRepository.existsBySlug(request.slug())) {
            throw new MenuException(Reason.CONFLICT, "이미 사용 중인 slug입니다.");
        }

        Menu menu = Menu.create(category, request.slug(), request.toDetails());
        return MenuResponse.from(menuRepository.save(menu));
    }

    @Transactional
    public MenuResponse update(Long id, MenuUpdateRequest request) {
        Menu menu = findMenu(id);
        Category category = findCategory(request.categoryId());

        menu.update(category, request.toDetails());

        return MenuResponse.from(menu);
    }

    @Transactional
    public void delete(Long id) {
        findMenu(id).archive();
    }

    private Sort toSort(String sort) {
        return switch (sort) {
            case "oldest" -> Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id"));
            case "name" -> Sort.by(Sort.Order.asc("name"), Sort.Order.asc("id"));
            case "price-low" -> Sort.by(Sort.Order.asc("price"), Sort.Order.asc("id"));
            case "price-high" -> Sort.by(Sort.Order.desc("price"), Sort.Order.desc("id"));
            default -> Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
        };
    }

    private Menu findMenu(Long id) {
        return menuRepository.findByIdAndArchivedAtIsNull(id)
                .orElseThrow(() -> new MenuException(Reason.NOT_FOUND, "메뉴를 찾을 수 없습니다."));
    }

    private Category findCategory(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new MenuException(Reason.INVALID_INPUT, "존재하지 않는 카테고리입니다."));
    }
}
