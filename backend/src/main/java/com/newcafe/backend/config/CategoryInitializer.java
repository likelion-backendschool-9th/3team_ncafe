package com.newcafe.backend.config;

import com.newcafe.backend.service.admin.CategoriesService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CategoryInitializer implements ApplicationRunner {

    private final CategoriesService categoriesService;

    @Override
    public void run(ApplicationArguments args) {
        categoriesService.initializeFallback();
    }
}
