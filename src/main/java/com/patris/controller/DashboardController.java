package com.patris.controller;

import java.util.List;
import java.util.Map;
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

    /** Pilier 2 Sprint 5 — Courbe de dépréciation prévisionnelle sur 36 mois */
    @GetMapping("/depreciation-forecast")
    public List<Map<String, Object>> depreciationForecast() {
        return service.getDepreciationForecast();
    }

    /** Pilier 2 Sprint 5 — Heatmap des risques (top 20 biens les plus exposés) */
    @GetMapping("/risk-heatmap")
    public List<Map<String, Object>> riskHeatmap() {
        return service.getRiskHeatmap();
    }

    /** Pilier 2 Sprint 5 — Alertes intelligentes configurées par règles métier */
    @GetMapping("/alertes-intelligentes")
    public List<Map<String, Object>> alertesIntelligentes() {
        return service.getAlertesIntelligentes();
    }
}
