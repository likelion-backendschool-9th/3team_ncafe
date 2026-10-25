package com.newcafe.backend.service;

import com.newcafe.backend.dto.menus.MenuResponse;
import com.newcafe.backend.repository.MenuRepository;

import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HomeService {

    private final MenuRepository menuRepository;

    @Transactional(readOnly = true)
    public List<MenuResponse> recommendedMenus() {
        return menuRepository.findTop16ByAvailableTrueAndRecommendedTrueAndArchivedAtIsNullOrderByCreatedAtDescIdDesc()
                .stream()
                .map(MenuResponse::from)
                .toList();
    }
}
