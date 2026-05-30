package com.patris.copilot;

import java.util.List;

public record CopilotResponse(
    String answer,
    String type,               // "INFO" | "ALERTE" | "RECOMMANDATION" | "RAPPORT"
    List<CopilotItem> items,   // liste de biens ou données associées
    String suggestion          // prochaine question suggérée
) {
    public record CopilotItem(
        String label,
        String value,
        String badge  // couleur : "danger" | "warning" | "success" | "info"
    ) {}
}
