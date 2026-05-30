package com.patris.dto.inventaire;

public record InventaireCampagneStatsDTO(
        Long campagneId,
        long totalFiches,
        long fichesRecensees,
        long fichesValideesAgent,
        long fichesValideesSuperviseur,
        long fichesAvecAnomalie,
        long ecartsEnAttente,
        long ecartsTotal,
        int tauxCouverture,
        int tauxConformite,
        int tauxValidationSuperviseur
) {}
