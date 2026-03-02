package com.patris.dto;

import java.util.Map;

public record DashboardStatsDTO(
    double valeurTotale,
    double tauxOccupation,
    Map<String, Long> biensParEtat,
    long biensReformer,
    long biensSansEntretien,
    long stockCritique,
    double coutTotalEntretiens
) {}
