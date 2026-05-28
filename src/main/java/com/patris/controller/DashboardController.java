package com.patris.controller;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.patris.dto.DashboardStatsDTO;
import com.patris.service.DashboardService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService service;

    @GetMapping("/stats")
    public DashboardStatsDTO stats(){
        return service.getStats();
    }

    @GetMapping("/evolution-mensuelle")
    public List<DashboardStatsDTO.EvolutionMensuelleDTO> evolutionMensuelle() {
        return service.getEvolutionMensuelle();
    }

    @GetMapping("/repartition-categories")
    public List<DashboardStatsDTO.CategoryDistributionDTO> repartitionCategories() {
        return service.getRepartitionCategories();
    }

    @GetMapping("/top-alertes")
    public List<DashboardStatsDTO.DashboardAlerteBienDTO> topAlertes() {
        return service.getTopAlertes();
    }
}
