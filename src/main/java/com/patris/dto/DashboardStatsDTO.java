package com.patris.dto;

import java.util.List;

public record DashboardStatsDTO(
    long totalBiens,
    double valeurTotale,
    double valeurNette,
    long biensAffectes,
    long biensNonAffectes,
    long biensEnMaintenance,
    long biensSinistres,
    long biensReformesThisYear,
    long stocksEnAlerte,
    long mouvementsThisMois,
    List<DashboardAlerteBienDTO> prochainesMaintenance,
    List<DashboardAlerteStockDTO> alertesStock,
    List<DashboardActiviteDTO> activiteRecente,
    double coutEntretienAnnuel,
    double ecartInventaireComptabilite,
    double tauxVetusteGlobal,
    List<CategoryDistributionDTO> repartitionCategories,
    List<EvolutionMensuelleDTO> evolutionMensuelle
) {
    public record DashboardAlerteBienDTO(
        Long id,
        String iup,
        String designation,
        String categorie,
        String service,
        String dateEcheance,
        String typeAlerte
    ) {}

    public record DashboardAlerteStockDTO(
        Long stockId,
        String codeArticle,
        String nomProduit,
        int quantite,
        int seuilAlerte,
        String unite,
        String magasin
    ) {}

    public record DashboardActiviteDTO(
        Long id,
        String action,
        String entite,
        Long entiteId,
        String acteur,
        String timestamp,
        String details
    ) {}

    public record CategoryDistributionDTO(
        String name,
        long count,
        double value
    ) {}

    public record EvolutionMensuelleDTO(
        String label,
        double value
    ) {}
}

