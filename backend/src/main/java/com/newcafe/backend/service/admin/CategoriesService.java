package com.newcafe.backend.service.admin;

import com.newcafe.backend.common.error.CategoryException;
import com.newcafe.backend.common.error.CategoryException.Reason;
import com.newcafe.backend.dto.categories.CategoryOrderRequest;
import com.newcafe.backend.dto.categories.CategoryRequest;
import com.newcafe.backend.dto.categories.CategoryResponse;
import com.newcafe.backend.entity.category.Category;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CategoriesService {

    private final CategoryRepository categoryRepository;
    private final MenuRepository menuRepository;

    @Transactional
    public void initializeFallback() {
        if (categoryRepository.findFallback().isPresent()) {
            return;
        }

        if (categoryRepository.existsByName(Category.FALLBACK_NAME)) {
            throw new CategoryException(Reason.CONFLICT, "기타 카테고리의 보호 상태가 올바르지 않습니다.");
        }

        categoryRepository.save(Category.createFallback(nextOrder()));
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        return toResponses(categoryRepository.findAllByOrderByDisplayOrderAsc());
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        lockFallback();

        String normalizedName = request.name();
        if (normalizedName != null && categoryRepository.existsByName(normalizedName)) {
            throw new CategoryException(Reason.CONFLICT, "이미 존재하는 카테고리입니다.");
        }

        Category category = Category.create(normalizedName, nextOrder());
        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse rename(Long id, CategoryRequest request) {
        lockFallback();

        Category category = findCategory(id);
        String normalizedName = request.name();
        if (normalizedName != null && categoryRepository.existsByNameAndIdNot(normalizedName, id)) {
            throw new CategoryException(Reason.CONFLICT, "이미 존재하는 카테고리입니다.");
        }

        category.rename(normalizedName);

        return toResponse(category);
    }

    @Transactional
    public List<CategoryResponse> reorder(CategoryOrderRequest request) {
        lockFallback();

        List<Category> current = categoryRepository.findAllByOrderByDisplayOrderAsc();
        List<Long> orderedIds = request.orderedIds();
        validateOrderedIds(orderedIds);

        Map<Long, Category> byId = new HashMap<>();
        current.forEach(category -> byId.put(category.getId(), category));
        if (orderedIds.size() != current.size() || !byId.keySet().containsAll(orderedIds)) {
            throw new CategoryException(Reason.CONFLICT, "카테고리 목록이 변경되었습니다. 새로고침 후 다시 시도해 주세요.");
        }

        List<Category> reordered = orderedIds.stream().map(byId::get).toList();
        saveOrderWithoutUniqueCollision(reordered);

        return toResponses(reordered);
    }

    @Transactional
    public void delete(Long id) {
        Category fallback = lockFallback();
        Category category = findCategory(id);
        if (category.isFallback()) {
            throw new CategoryException(Reason.CONFLICT, "기타 카테고리는 삭제할 수 없습니다.");
        }

        menuRepository.moveToCategory(category, fallback);
        categoryRepository.delete(category);

        saveOrderWithoutUniqueCollision(categoryRepository.findAllByOrderByDisplayOrderAsc());
    }

    private Category lockFallback() {
        return categoryRepository.findFallbackForUpdate()
                .orElseThrow(() -> new IllegalStateException("기타 카테고리가 초기화되지 않았습니다."));
    }

    private Category findCategory(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new CategoryException(Reason.NOT_FOUND, "카테고리를 찾을 수 없습니다."));
    }

    private int nextOrder() {
        return categoryRepository.findAllByOrderByDisplayOrderAsc().stream()
                .mapToInt(Category::getDisplayOrder)
                .max()
                .orElse(0) + 1;
    }

    private void validateOrderedIds(List<Long> orderedIds) {
        if (orderedIds == null || orderedIds.isEmpty()
                || orderedIds.stream().anyMatch(id -> id == null || id < 1)
                || new HashSet<>(orderedIds).size() != orderedIds.size()) {
            throw new CategoryException(Reason.INVALID_ORDER, "카테고리 순서에 중복되거나 잘못된 ID가 있습니다.");
        }
    }

    private void saveOrderWithoutUniqueCollision(List<Category> ordered) {
        int nextTemporaryOrder = ordered.stream().mapToInt(Category::getDisplayOrder).max().orElse(0) + 1;
        for (Category category : ordered) {
            category.changeDisplayOrder(nextTemporaryOrder++);
        }

        categoryRepository.flush();

        for (int i = 0; i < ordered.size(); i++) {
            ordered.get(i).changeDisplayOrder(i + 1);
        }
    }

    private CategoryResponse toResponse(Category category) {
        return CategoryResponse.from(category, menuRepository.countByCategory_Id(category.getId()));
    }

    private List<CategoryResponse> toResponses(List<Category> categories) {
        Map<Long, Long> menuCounts = menuRepository.countByCategory().stream()
                .collect(Collectors.toMap(MenuRepository.CategoryMenuCount::getCategoryId,
                        MenuRepository.CategoryMenuCount::getMenuCount));

        return categories.stream()
                .map(category -> CategoryResponse.from(category, menuCounts.getOrDefault(category.getId(), 0L)))
                .toList();
    }
}
