package com.newcafe.backend.dto.menus;

import com.newcafe.backend.entity.menu.MenuDetails;
import com.newcafe.backend.entity.menu.MenuFields;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MenuCreateRequest(
        @NotNull(message = "카테고리를 선택해 주세요.")
        Long categoryId,

        @NotBlank(message = "slug를 입력해 주세요.")
        @Size(max = MenuFields.SLUG_MAX_LENGTH, message = "slug는 100자 이하로 입력해 주세요.")
        @Pattern(regexp = MenuFields.SLUG_PATTERN, message = "slug는 소문자·숫자·하이픈만 사용할 수 있습니다.")
        String slug,

        @NotBlank(message = "메뉴명을 입력해 주세요.")
        @Size(max = MenuFields.NAME_MAX_LENGTH, message = "메뉴명은 80자 이하로 입력해 주세요.")
        String name,

        @NotBlank(message = "설명을 입력해 주세요.")
        @Size(max = MenuFields.DESCRIPTION_MAX_LENGTH, message = "설명은 500자 이하로 입력해 주세요.")
        String description,

        @NotBlank(message = "이미지 주소를 입력해 주세요.")
        @Size(max = MenuFields.IMAGE_URL_MAX_LENGTH, message = "이미지 주소는 2048자 이하로 입력해 주세요.")
        @Pattern(regexp = MenuFields.IMAGE_URL_PATTERN, message = "HTTPS 이미지 주소나 /images/menus/ 경로를 입력해 주세요.")
        String imageUrl,

        @NotNull(message = "가격을 입력해 주세요.")
        @Min(value = MenuFields.PRICE_MIN, message = "가격은 1원 이상으로 입력해 주세요.")
        @Max(value = MenuFields.PRICE_MAX, message = "가격은 1,000,000원 이하로 입력해 주세요.")
        Integer price,

        @NotNull(message = "판매 상태를 선택해 주세요.")
        Boolean available,

        @NotNull(message = "첫 개시 여부를 선택해 주세요.")
        Boolean isNew,

        @NotNull(message = "추천 메뉴 여부를 선택해 주세요.")
        Boolean recommended,

        @NotNull(message = "핫 지원 여부를 선택해 주세요.")
        Boolean supportsHot,

        @NotNull(message = "아이스 지원 여부를 선택해 주세요.")
        Boolean supportsIced
) {
    public MenuCreateRequest {
        slug = MenuFields.normalize(slug);
        name = MenuFields.normalize(name);
        description = MenuFields.normalize(description);
        imageUrl = MenuFields.normalize(imageUrl);
    }

    public MenuDetails toDetails() {
        return new MenuDetails(name, description, imageUrl, price, available, isNew, recommended, supportsHot,
                supportsIced);
    }
}
