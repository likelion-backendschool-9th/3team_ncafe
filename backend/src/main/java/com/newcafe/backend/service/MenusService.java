package com.newcafe.backend.service;

import com.newcafe.backend.common.error.MenuException;
import com.newcafe.backend.common.error.MenuException.Reason;
import com.newcafe.backend.dto.menus.MenuCategoryResponse;
import com.newcafe.backend.dto.menus.MenuPageResponse;
import com.newcafe.backend.dto.menus.MenuResponse;
import com.newcafe.backend.dto.menus.MenuSearchRequest;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.repository.MenuSpecifications;

import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("publicMenusService")
@RequiredArgsConstructor
public class MenusService {

    private final MenuRepository menuRepository;
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public MenuPageResponse list(MenuSearchRequest request) {
        PageRequest pageRequest = PageRequest.of(request.page(), request.size(), toSort(request.sort()));

        return MenuPageResponse.from(menuRepository.findAll(
                MenuSpecifications.publicSearch(request.q(), request.categoryId(), request.available()), pageRequest));
    }

    @Transactional(readOnly = true)
    public List<MenuCategoryResponse> categories() {
        return categoryRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(MenuCategoryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public MenuResponse get(String slug) {
        return menuRepository.findBySlugAndArchivedAtIsNull(slug)
                .map(MenuResponse::from)
                .orElseThrow(() -> new MenuException(Reason.NOT_FOUND, "메뉴를 찾을 수 없습니다."));
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
}
