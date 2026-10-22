package com.newcafe.backend.dto.categories;

import com.newcafe.backend.entity.CategoryName;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank(message = "카테고리명을 입력해 주세요.")
        @Size(max = 40, message = "카테고리명은 40자 이하로 입력해 주세요.")
        String name
) {
    public CategoryRequest {
        name = CategoryName.normalize(name);
    }
}
