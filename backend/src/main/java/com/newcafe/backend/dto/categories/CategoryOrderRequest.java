package com.newcafe.backend.dto.categories;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public record CategoryOrderRequest(
        @NotEmpty(message = "카테고리 순서를 입력해 주세요.")
        List<@NotNull @Positive Long> orderedIds
) {
    public CategoryOrderRequest {
        orderedIds = orderedIds == null ? null : Collections.unmodifiableList(new ArrayList<>(orderedIds));
    }
}
