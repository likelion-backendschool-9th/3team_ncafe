package com.newcafe.backend.service.admin;

import com.newcafe.backend.dto.menus.MenuSummaryResponse;
import com.newcafe.backend.dto.orders.OrderSummaryResponse;
import com.newcafe.backend.dto.songs.SongSummaryResponse;
import com.newcafe.backend.entity.order.Order;
import com.newcafe.backend.entity.song.SongStatus;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.repository.OrderRepository;
import com.newcafe.backend.repository.SongRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("adminHomeService")
@RequiredArgsConstructor
public class HomeService {

    private final MenuRepository menuRepository;
    private final OrderRepository orderRepository;
    private final SongRepository songRepository;

    // 관리자 메뉴 목록과 같이 삭제(숨김)한 메뉴는 세지 않는다.
    @Transactional(readOnly = true)
    public MenuSummaryResponse menuSummary() {
        long total = menuRepository.countByArchivedAtIsNull();
        long available = menuRepository.countByAvailableTrueAndArchivedAtIsNull();

        return new MenuSummaryResponse(total, available, total - available);
    }

    // 관리자 주문 목록의 "처리 중" 그룹과 같은 기준으로 센다.
    @Transactional(readOnly = true)
    public OrderSummaryResponse orderSummary() {
        return new OrderSummaryResponse(orderRepository.countByStatusIn(Order.ACTIVE_STATUSES));
    }

    // 아직 플레이리스트에 담지 않은 접수 상태의 신청곡만 센다.
    @Transactional(readOnly = true)
    public SongSummaryResponse songSummary() {
        return new SongSummaryResponse(songRepository.countByStatus(SongStatus.pending));
    }
}
