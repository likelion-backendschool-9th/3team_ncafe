package com.newcafe.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.newcafe.backend.entity.cartitem.CartItem;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.data.repository.query.parser.Part;
import org.springframework.data.repository.query.parser.PartTree;

// 메서드 이름 쿼리가 회원 ID로 줄을 거르는지 확인한다 (S9·S11·S13 회원 분리).
class CartItemRepositoryTest {

    @Test
    void s9ListFiltersByMemberInAddedOrder() {
        PartTree tree = new PartTree("findAllByUserIdOrderByIdAsc", CartItem.class);

        assertEquals(List.of("userId"), properties(tree));
        assertEquals(Sort.by(Sort.Order.asc("id")), tree.getSort());
    }

    @Test
    void s11OwnedLineLookupRequiresIdAndMember() {
        PartTree tree = new PartTree("findByIdAndUserId", CartItem.class);

        assertEquals(List.of("id", "userId"), properties(tree));
    }

    @Test
    void s3SameLineLookupHandlesNullTemperature() {
        PartTree withTemperature = new PartTree("findByUserIdAndMenu_IdAndTemperature", CartItem.class);
        PartTree withoutTemperature = new PartTree("findByUserIdAndMenu_IdAndTemperatureIsNull", CartItem.class);

        assertEquals(List.of("userId", "menu.id", "temperature"), paths(withTemperature));
        assertEquals(List.of("userId", "menu.id", "temperature"), paths(withoutTemperature));
        assertEquals(Part.Type.IS_NULL, withoutTemperature.getParts().stream().toList().get(2).getType());
    }

    private static List<String> properties(PartTree tree) {
        return tree.getParts().stream()
                .map(Part::getProperty)
                .map(property -> property.getSegment())
                .toList();
    }

    private static List<String> paths(PartTree tree) {
        return tree.getParts().stream()
                .map(Part::getProperty)
                .map(property -> property.toDotPath())
                .toList();
    }
}
