package com.newcafe.backend.service.admin;

import com.newcafe.backend.dto.menus.MenuSummaryResponse;
import com.newcafe.backend.repository.MenuRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("adminHomeService")
@RequiredArgsConstructor
public class HomeService {

    private final MenuRepository menuRepository;

    // 관리자 메뉴 목록과 같이 삭제(숨김)한 메뉴는 세지 않는다.
    @Transactional(readOnly = true)
    public MenuSummaryResponse menuSummary() {
        long total = menuRepository.countByArchivedAtIsNull();
        long available = menuRepository.countByAvailableTrueAndArchivedAtIsNull();

        return new MenuSummaryResponse(total, available, total - available);
    }
}
