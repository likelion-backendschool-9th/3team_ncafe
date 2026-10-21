package com.newcafe.backend.service.admin;

import com.newcafe.backend.dto.categories.CategoryOrderRequest;
import com.newcafe.backend.dto.categories.CategoryRequest;
import com.newcafe.backend.dto.categories.CategoryResponse;
import com.newcafe.backend.entity.Category;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.service.admin.CategoryException.Reason;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoriesService {

    private final CategoryRepository categoryRepository;
    private final MenuRepository menuRepository;

    public CategoriesService(CategoryRepository categoryRepository, MenuRepository menuRepository) {
        this.categoryRepository = categoryRepository;
        this.menuRepository = menuRepository;
    }

    @Transactional
    public void initializeFallback() {
        if (categoryRepository.findFallback().isPresent()) {
            return;
        }
        if (categoryRepository.existsByName(Category.FALLBACK_NAME)) {
            throw new CategoryException(Reason.CONFLICT, "기타 카테고리의 보호 상태가 올바르지 않습니다.");
        }
        int lastOrder = categoryRepository.findAllByOrderByDisplayOrderAsc().stream()
                .mapToInt(Category::getDisplayOrder)
                .max()
                .orElse(0);
        categoryRepository.saveAndFlush(Category.createFallback(lastOrder + 1));
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        return categoryRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        lockFallback();
        String normalizedName = request.name();
        if (Category.FALLBACK_NAME.equals(normalizedName)
                || (normalizedName != null && categoryRepository.existsByName(normalizedName))) {
            throw new CategoryException(Reason.CONFLICT, "이미 존재하는 카테고리입니다.");
        }
        Category category = Category.create(normalizedName, nextOrder());
        return toResponse(categoryRepository.saveAndFlush(category));
    }

    @Transactional
    public CategoryResponse rename(Long id, CategoryRequest request) {
        lockFallback();
        Category category = findCategory(id);
        String normalizedName = request.name();
        if (category.isFallback()) {
            throw new CategoryException(Reason.CONFLICT, "기타 카테고리는 수정할 수 없습니다.");
        }
        if (Category.FALLBACK_NAME.equals(normalizedName)) {
            throw new CategoryException(Reason.CONFLICT, "기타는 보호된 카테고리 이름입니다.");
        }
        if (normalizedName != null && categoryRepository.existsByNameAndIdNot(normalizedName, id)) {
            throw new CategoryException(Reason.CONFLICT, "이미 존재하는 카테고리입니다.");
        }
        category.rename(normalizedName);
        categoryRepository.flush();
        return toResponse(category);
    }

    @Transactional
    public List<CategoryResponse> reorder(CategoryOrderRequest request) {
        lockFallback();
        List<Category> current = categoryRepository.findAllByOrderByDisplayOrderAsc();
        List<Long> orderedIds = request.orderedIds();
        if (orderedIds == null || orderedIds.stream().anyMatch(id -> id == null || id < 1)
                || new HashSet<>(orderedIds).size() != orderedIds.size()) {
            throw new CategoryException(Reason.INVALID_ORDER, "카테고리 순서에 중복되거나 잘못된 ID가 있습니다.");
        }
        Map<Long, Category> byId = new HashMap<>();
        current.forEach(category -> byId.put(category.getId(), category));
        if (orderedIds.size() != current.size() || !byId.keySet().containsAll(orderedIds)) {
            throw new CategoryException(Reason.CONFLICT, "카테고리 목록이 변경되었습니다. 새로고침 후 다시 시도해 주세요.");
        }
        List<Category> reordered = orderedIds.stream().map(byId::get).toList();
        saveOrderWithoutUniqueCollision(reordered);
        return reordered.stream().map(this::toResponse).toList();
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
        categoryRepository.flush();
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

    private void saveOrderWithoutUniqueCollision(List<Category> ordered) {
        int nextTemporaryOrder = ordered.stream().mapToInt(Category::getDisplayOrder).max().orElse(0) + 1;
        for (Category category : ordered) {
            category.changeDisplayOrder(nextTemporaryOrder++);
        }
        categoryRepository.flush();
        for (int i = 0; i < ordered.size(); i++) {
            ordered.get(i).changeDisplayOrder(i + 1);
        }
        categoryRepository.flush();
    }

    private CategoryResponse toResponse(Category category) {
        return CategoryResponse.from(category, menuRepository.countByCategory_Id(category.getId()));
    }
}
