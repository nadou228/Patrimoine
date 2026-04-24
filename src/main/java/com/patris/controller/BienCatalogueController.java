package com.patris.controller;

import com.patris.model.BienCatalogueItem;
import com.patris.service.BienCatalogueService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/biens/catalogue")
@RequiredArgsConstructor
public class BienCatalogueController {

    private final BienCatalogueService bienCatalogueService;

    @GetMapping
    public List<BienCatalogueItem> findAll() {
        return bienCatalogueService.findAllActive();
    }
}
