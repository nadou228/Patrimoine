package com.patris.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;

import com.patris.audit.AuditLogRepository;
import com.patris.dto.DashboardStatsDTO;
import com.patris.model.Bien;
import com.patris.model.BienMaterielRoulant;
import com.patris.model.BienMobilier;
import com.patris.model.Stock;
import com.patris.model.Entretien;
import com.patris.model.InventaireCampagne;
import com.patris.model.InventaireFiche;
import com.patris.repository.BienRepository;
import com.patris.repository.MouvementStockRepository;
import com.patris.repository.ReformeRepository;
import com.patris.repository.SinistreRepository;
import com.patris.repository.StockRepository;
import com.patris.repository.EntretienRepository;
import com.patris.repository.InventaireCampagneRepository;
import com.patris.repository.InventaireFicheRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final BienRepository bienRepository;
    private final StockRepository stockRepository;
    private final MouvementStockRepository mouvementStockRepository;
    private final SinistreRepository sinistreRepository;
    private final ReformeRepository reformeRepository;
    private final AuditLogRepository auditLogRepository;
    private final EntretienRepository entretienRepository;
    private final InventaireCampagneRepository inventaireCampagneRepository;
    private final InventaireFicheRepository inventaireFicheRepository;

    public DashboardStatsDTO getStats() {
        List<Bien> biens = bienRepository.findAllByArchivedFalse();
        List<Stock> stocks = stockRepository.findAll();
        LocalDate now = LocalDate.now();

        long totalBiens = biens.size();
        double valeurTotale = biens.stream().mapToDouble(Bien::getValeur).sum();
        double valeurNette = biens.stream().mapToDouble(bien -> bien.getValeurNetteComptable() == null ? 0 : bien.getValeurNetteComptable()).sum();
        long biensAffectes = biens.stream().filter(bien -> "AFFECTE".equalsIgnoreCase(String.valueOf(bien.getStatutOperationnel())) || (bien.getService() != null && !bien.getService().isBlank())).count();
        long biensNonAffectes = Math.max(0, totalBiens - biensAffectes);
        long biensEnMaintenance = biens.stream().filter(bien -> "EN_MAINTENANCE".equalsIgnoreCase(String.valueOf(bien.getStatutOperationnel()))).count();
        long biensSinistres = biens.stream().filter(bien -> "SINISTRE".equalsIgnoreCase(String.valueOf(bien.getStatutOperationnel()))).count();
        long biensReformesThisYear = reformeRepository.findAll().stream()
            .filter(reforme -> reforme.getDateReforme() != null && reforme.getDateReforme().getYear() == Year.now().getValue())
            .count();
        long stocksEnAlerte = stocks.stream().filter(this::isStockInAlert).count();
        long mouvementsThisMois = mouvementStockRepository.findAll().stream()
            .filter(mouvement -> mouvement.getDateMouvement() != null
                && mouvement.getDateMouvement().getYear() == now.getYear()
                && mouvement.getDateMouvement().getMonthValue() == now.getMonthValue())
            .count();

        List<DashboardStatsDTO.DashboardAlerteBienDTO> prochainesMaintenance = biens.stream()
            .map(this::toMaintenanceAlert)
            .filter(java.util.Objects::nonNull)
            .sorted(Comparator.comparing(DashboardStatsDTO.DashboardAlerteBienDTO::dateEcheance, Comparator.nullsLast(String::compareTo)))
            .limit(5)
            .toList();

        List<DashboardAlerteStockDTOImpl> alertesStockTmp = stocks.stream()
            .filter(this::isStockInAlert)
            .sorted(Comparator.comparingInt(stock -> stock.getQuantite() - resolveStockThreshold(stock)))
            .limit(5)
            .map(stock -> new DashboardAlerteStockDTOImpl(
                stock.getId(),
                stock.getConsommable() != null ? stock.getConsommable().getCodeArticle() : "",
                stock.getConsommable() != null ? stock.getConsommable().getNomProduit() : "Article",
                stock.getQuantite(),
                resolveStockThreshold(stock),
                stock.getUnite(),
                stock.getMagasin() != null ? stock.getMagasin().getNom() : ""
            ))
            .toList();

        List<DashboardStatsDTO.DashboardAlerteStockDTO> alertesStock = alertesStockTmp.stream()
            .map(impl -> new DashboardStatsDTO.DashboardAlerteStockDTO(
                impl.stockId(),
                impl.codeArticle(),
                impl.nomProduit(),
                impl.quantite(),
                impl.seuilAlerte(),
                impl.unite(),
                impl.magasin()
            ))
            .toList();

        List<DashboardStatsDTO.DashboardActiviteDTO> activiteRecente = auditLogRepository.findAll().stream()
            .sorted(Comparator.comparing(audit -> audit.getDateAction() == null ? LocalDateTime.MIN : audit.getDateAction(), Comparator.reverseOrder()))
            .limit(20)
            .map(audit -> new DashboardStatsDTO.DashboardActiviteDTO(
                audit.getId(),
                audit.getAction(),
                audit.getEntite(),
                audit.getEntiteId(),
                audit.getUsername(),
                audit.getDateAction() != null ? audit.getDateAction().toString() : null,
                audit.getDetail()
            ))
            .toList();

        // 1. Calcul coutEntretienAnnuel
        double coutEntretienAnnuel = entretienRepository.findAll().stream()
            .filter(e -> {
                LocalDate d = e.getDateRealisee() != null ? e.getDateRealisee() : e.getDatePrevue();
                return d != null && d.getYear() == now.getYear() && e.getCout() != null;
            })
            .mapToDouble(Entretien::getCout)
            .sum();

        // 2. Calcul ecartInventaireComptabilite
        double ecartInventaireComptabilite = 0.0;
        List<InventaireCampagne> campagnes = inventaireCampagneRepository.findAll();
        if (!campagnes.isEmpty()) {
            InventaireCampagne latest = campagnes.stream()
                .filter(c -> c.getDateCreation() != null)
                .max(Comparator.comparing(InventaireCampagne::getDateCreation))
                .orElse(null);
            if (latest == null && !campagnes.isEmpty()) {
                latest = campagnes.get(campagnes.size() - 1);
            }
            if (latest != null) {
                List<InventaireFiche> fiches = inventaireFicheRepository.findByCampagneId(latest.getId());
                double valeurComptableTotal = fiches.stream()
                    .mapToDouble(f -> f.getBien() != null ? f.getBien().getValeur() : 0.0)
                    .sum();
                double valeurInventorieeTotal = fiches.stream()
                    .filter(f -> f.getValidationSuperviseur() == com.patris.enums.statutValidation.VALIDE)
                    .mapToDouble(f -> f.getBien() != null ? f.getBien().getValeur() : 0.0)
                    .sum();
                ecartInventaireComptabilite = Math.abs(valeurComptableTotal - valeurInventorieeTotal);
            }
        }

        // 3. Calcul tauxVetusteGlobal
        double totalAmortissement = biens.stream()
            .mapToDouble(b -> b.getAmortissementCumule() == null ? 0.0 : b.getAmortissementCumule())
            .sum();
        double totalValeurForVetuste = biens.stream()
            .mapToDouble(Bien::getValeur)
            .sum();
        double tauxVetusteGlobal = totalValeurForVetuste > 0 ? (totalAmortissement / totalValeurForVetuste) * 100.0 : 0.0;

        // 4. Calcul repartitionCategories
        List<DashboardStatsDTO.CategoryDistributionDTO> repartitionCategories = buildCategoryDistribution(biens);

        List<DashboardStatsDTO.EvolutionMensuelleDTO> evolutionMensuelle = buildMonthlyEvolution(biens, now);

        return new DashboardStatsDTO(
            totalBiens,
            valeurTotale,
            valeurNette,
            biensAffectes,
            biensNonAffectes,
            biensEnMaintenance,
            biensSinistres,
            biensReformesThisYear,
            stocksEnAlerte,
            mouvementsThisMois,
            prochainesMaintenance,
            alertesStock,
            activiteRecente,
            coutEntretienAnnuel,
            ecartInventaireComptabilite,
            tauxVetusteGlobal,
            repartitionCategories,
            evolutionMensuelle
        );
    }

    public List<DashboardStatsDTO.EvolutionMensuelleDTO> getEvolutionMensuelle() {
        return buildMonthlyEvolution(bienRepository.findAllByArchivedFalse(), LocalDate.now());
    }

    public List<DashboardStatsDTO.CategoryDistributionDTO> getRepartitionCategories() {
        return buildCategoryDistribution(bienRepository.findAllByArchivedFalse());
    }

    public List<DashboardStatsDTO.DashboardAlerteBienDTO> getTopAlertes() {
        return bienRepository.findAllByArchivedFalse().stream()
            .map(this::toRiskAlert)
            .filter(java.util.Objects::nonNull)
            .sorted(Comparator.comparingInt(RiskAlert::score).reversed())
            .limit(5)
            .map(risk -> risk.payload())
            .toList();
    }

    private boolean isStockInAlert(Stock stock) {
        return stock.getQuantite() <= resolveStockThreshold(stock);
    }

    private int resolveStockThreshold(Stock stock) {
        if (stock.getSeuilAlerte() > 0) {
            return stock.getSeuilAlerte();
        }
        return stock.getConsommable() != null ? stock.getConsommable().getSeuilAlerte() : 0;
    }

    private DashboardStatsDTO.DashboardAlerteBienDTO toMaintenanceAlert(Bien bien) {
        LocalDate date = null;
        String typeAlerte = null;

        if (bien instanceof BienMobilier mobilier && mobilier.getDateProchaineMaintenance() != null) {
            date = mobilier.getDateProchaineMaintenance();
            typeAlerte = "MAINTENANCE";
        } else if (bien instanceof BienMaterielRoulant roulant && roulant.getDateProchaineVisiteTechnique() != null) {
            date = roulant.getDateProchaineVisiteTechnique();
            typeAlerte = "VISITE_TECHNIQUE";
        }

        if (date == null || date.isAfter(LocalDate.now().plusDays(30))) {
            return null;
        }

        return new DashboardStatsDTO.DashboardAlerteBienDTO(
            bien.getId(),
            bien.getIup(),
            bien.getDesignation(),
            bien.getCodeSousCategorie() != null ? bien.getCodeSousCategorie() : bien.getCodeCategorie(),
            bien.getService(),
            date.toString(),
            typeAlerte
        );
    }

    private List<DashboardStatsDTO.CategoryDistributionDTO> buildCategoryDistribution(List<Bien> biens) {
        List<DashboardStatsDTO.CategoryDistributionDTO> repartitionCategories = new ArrayList<>();
        for (String cat : List.of("IMMOBILIER", "MOBILIER", "INFORMATIQUE", "MATERIEL_ROULANT", "MATERIEL_TECHNIQUE", "INCORPORELS", "OEUVRES_COLLECTIONS", "CHEPTELS")) {
            long count = biens.stream()
                .filter(bien -> cat.equalsIgnoreCase(bien.getCodeCategorie()))
                .count();
            double val = biens.stream()
                .filter(bien -> cat.equalsIgnoreCase(bien.getCodeCategorie()))
                .mapToDouble(Bien::getValeur)
                .sum();
            if (count > 0) {
                repartitionCategories.add(new DashboardStatsDTO.CategoryDistributionDTO(cat, count, val));
            }
        }
        return repartitionCategories;
    }

    private List<DashboardStatsDTO.EvolutionMensuelleDTO> buildMonthlyEvolution(List<Bien> biens, LocalDate now) {
        List<DashboardStatsDTO.EvolutionMensuelleDTO> evolutionMensuelle = new ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            LocalDate targetMonthEnd = now.minusMonths(i).withDayOfMonth(now.minusMonths(i).lengthOfMonth());
            double val = biens.stream()
                .filter(bien -> bien.getDateAcquisition() != null && !bien.getDateAcquisition().isAfter(targetMonthEnd))
                .mapToDouble(Bien::getValeur)
                .sum();
            String monthName = targetMonthEnd.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.FRENCH);
            monthName = monthName.substring(0, 1).toUpperCase() + monthName.substring(1);
            evolutionMensuelle.add(new DashboardStatsDTO.EvolutionMensuelleDTO(monthName, val));
        }
        return evolutionMensuelle;
    }

    private RiskAlert toRiskAlert(Bien bien) {
        int score = 0;
        LocalDate dateEcheance = null;
        String typeAlerte = "SURVEILLANCE";

        if ("SINISTRE".equalsIgnoreCase(String.valueOf(bien.getStatutOperationnel()))) {
            score += 100;
            typeAlerte = "SINISTRE";
        } else if ("EN_MAINTENANCE".equalsIgnoreCase(String.valueOf(bien.getStatutOperationnel()))) {
            score += 70;
            typeAlerte = "MAINTENANCE";
        }

        if (bien.getService() == null || bien.getService().isBlank()) {
            score += 20;
        }

        LocalDate maintenanceDate = resolveNextControlDate(bien);
        if (maintenanceDate != null) {
            dateEcheance = maintenanceDate;
            long daysUntil = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), maintenanceDate);
            if (daysUntil < 0) {
                score += 45;
            } else if (daysUntil <= 7) {
                score += 35;
            } else if (daysUntil <= 30) {
                score += 20;
            }
            if (typeAlerte.equals("SURVEILLANCE")) {
                typeAlerte = bien instanceof BienMaterielRoulant ? "VISITE_TECHNIQUE" : "MAINTENANCE";
            }
        }

        double tauxVetuste = bien.getValeur() > 0 && bien.getAmortissementCumule() != null
            ? (bien.getAmortissementCumule() / bien.getValeur()) * 100.0
            : 0.0;
        if (tauxVetuste >= 80) {
            score += 15;
        }

        if (score <= 0) {
            return null;
        }

        return new RiskAlert(
            score,
            new DashboardStatsDTO.DashboardAlerteBienDTO(
                bien.getId(),
                bien.getIup(),
                bien.getDesignation(),
                bien.getCodeSousCategorie() != null ? bien.getCodeSousCategorie() : bien.getCodeCategorie(),
                bien.getService(),
                dateEcheance != null ? dateEcheance.toString() : null,
                typeAlerte
            )
        );
    }

    private LocalDate resolveNextControlDate(Bien bien) {
        if (bien instanceof BienMobilier mobilier) {
            return mobilier.getDateProchaineMaintenance();
        }
        if (bien instanceof BienMaterielRoulant roulant) {
            return roulant.getDateProchaineVisiteTechnique();
        }
        return null;
    }

    private record DashboardAlerteStockDTOImpl(
        Long stockId,
        String codeArticle,
        String nomProduit,
        int quantite,
        int seuilAlerte,
        String unite,
        String magasin
    ) {}

    private record RiskAlert(
        int score,
        DashboardStatsDTO.DashboardAlerteBienDTO payload
    ) {}

    // ============================================================
    // SPRINT 5 — ANALYTICS PRÉDICTIFS
    // ============================================================

    /**
     * Courbe de dépréciation prévisionnelle sur 36 mois.
     * Calcul d'amortissement linéaire : valeur nette = valeur brute - (amortissement annuel × mois écoulés / 12)
     */
    public java.util.List<java.util.Map<String, Object>> getDepreciationForecast() {
        List<Bien> biens = bienRepository.findAllByArchivedFalse();
        LocalDate now = LocalDate.now();

        double valeurNetteActuelle = biens.stream()
            .mapToDouble(b -> b.getValeurNetteComptable() != null ? b.getValeurNetteComptable() : b.getValeur())
            .sum();
        double amortissementAnnuelTotal = biens.stream()
            .mapToDouble(b -> {
                if (b.getValeur() <= 0 || b.getDureeAmortissement() == null || b.getDureeAmortissement() <= 0) return 0;
                return b.getValeur() / b.getDureeAmortissement();
            })
            .sum();
        double amortissementMensuel = amortissementAnnuelTotal / 12.0;

        java.util.List<java.util.Map<String, Object>> result = new ArrayList<>();
        double valeurCourante = valeurNetteActuelle;

        for (int i = 0; i <= 36; i++) {
            LocalDate date = now.plusMonths(i);
            String label = date.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.FRENCH)
                + " " + date.getYear();
            result.add(java.util.Map.of(
                "label", label,
                "valeurNette", Math.max(0, Math.round(valeurCourante)),
                "mois", i
            ));
            valeurCourante = Math.max(0, valeurCourante - amortissementMensuel);
        }
        return result;
    }

    /**
     * Risk Heatmap : Score de risque multicritère pour chaque bien (top 20).
     * Critères : vétusté, statut opérationnel, maintenance en retard, non-affectation.
     */
    public java.util.List<java.util.Map<String, Object>> getRiskHeatmap() {
        List<Bien> biens = bienRepository.findAllByArchivedFalse();
        LocalDate now = LocalDate.now();

        return biens.stream()
            .map(b -> {
                int score = 0;
                String niveau = "BAS";

                // Vétusté
                if (b.getValeur() > 0 && b.getAmortissementCumule() != null) {
                    double v = b.getAmortissementCumule() / b.getValeur() * 100;
                    if (v >= 90) score += 40;
                    else if (v >= 70) score += 25;
                    else if (v >= 50) score += 10;
                }

                // Statut opérationnel
                if ("SINISTRE".equalsIgnoreCase(String.valueOf(b.getStatutOperationnel()))) score += 40;
                else if ("EN_MAINTENANCE".equalsIgnoreCase(String.valueOf(b.getStatutOperationnel()))) score += 20;
                else if ("HORS_SERVICE".equalsIgnoreCase(String.valueOf(b.getStatutOperationnel()))) score += 30;

                // Maintenance en retard
                LocalDate nextControl = resolveNextControlDate(b);
                if (nextControl != null && nextControl.isBefore(now)) score += 25;
                else if (nextControl != null && nextControl.isBefore(now.plusDays(15))) score += 10;

                // Non affecté
                if (b.getService() == null || b.getService().isBlank()) score += 10;

                if (score >= 60) niveau = "CRITIQUE";
                else if (score >= 35) niveau = "ÉLEVÉ";
                else if (score >= 15) niveau = "MOYEN";

                double vetuste = b.getValeur() > 0 && b.getAmortissementCumule() != null
                    ? Math.round(b.getAmortissementCumule() / b.getValeur() * 100.0) : 0;

                return java.util.Map.<String, Object>of(
                    "id", b.getId(),
                    "iup", b.getIup() != null ? b.getIup() : "",
                    "designation", b.getDesignation() != null ? b.getDesignation() : "",
                    "categorie", b.getCodeCategorie() != null ? b.getCodeCategorie() : "",
                    "service", b.getService() != null ? b.getService() : "Non affecté",
                    "scoreRisque", score,
                    "niveau", niveau,
                    "vetuste", (int) vetuste
                );
            })
            .filter(m -> (int) m.get("scoreRisque") > 0)
            .sorted(java.util.Comparator.comparingInt(m -> -(int) ((java.util.Map<?, ?>) m).get("scoreRisque")))
            .limit(20)
            .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Alertes intelligentes générées par règles métier — détection proactive.
     */
    public java.util.List<java.util.Map<String, Object>> getAlertesIntelligentes() {
        List<Bien> biens = bienRepository.findAllByArchivedFalse();
        List<Stock> stocks = stockRepository.findAll();
        LocalDate now = LocalDate.now();
        java.util.List<java.util.Map<String, Object>> alertes = new ArrayList<>();

        // Règle 1 : Biens à vétusté > 80%
        long aReformer = biens.stream().filter(b -> b.getValeur() > 0 && b.getAmortissementCumule() != null
            && b.getAmortissementCumule() / b.getValeur() * 100 >= 80).count();
        if (aReformer > 0) {
            alertes.add(java.util.Map.of(
                "id", "REFORME_REQUISE",
                "titre", "Réforme requise",
                "message", aReformer + " bien(s) ont un taux de vétusté ≥ 80% et doivent être mis en réforme.",
                "niveau", "CRITIQUE",
                "count", aReformer,
                "action", "Accéder au module Réforme"
            ));
        }

        // Règle 2 : Maintenances en retard
        long maintenancesRetard = biens.stream()
            .filter(b -> resolveNextControlDate(b) != null && resolveNextControlDate(b).isBefore(now))
            .count();
        if (maintenancesRetard > 0) {
            alertes.add(java.util.Map.of(
                "id", "MAINTENANCE_RETARD",
                "titre", "Maintenances en retard",
                "message", maintenancesRetard + " bien(s) ont des maintenances dépassées. Chaque jour de retard augmente le risque de panne.",
                "niveau", "ÉLEVÉ",
                "count", maintenancesRetard,
                "action", "Voir le calendrier d'entretiens"
            ));
        }

        // Règle 3 : Stocks critiques
        long stocksRupture = stocks.stream().filter(s -> {
            int seuil = s.getSeuilAlerte() > 0 ? s.getSeuilAlerte() : (s.getConsommable() != null ? s.getConsommable().getSeuilAlerte() : 0);
            return s.getQuantite() <= seuil;
        }).count();
        if (stocksRupture > 0) {
            alertes.add(java.util.Map.of(
                "id", "STOCK_CRITIQUE",
                "titre", "Stocks en alerte",
                "message", stocksRupture + " consommable(s) sont sous le seuil critique. Un réapprovisionnement urgent est recommandé.",
                "niveau", "MOYEN",
                "count", stocksRupture,
                "action", "Accéder aux stocks"
            ));
        }

        // Règle 4 : Biens non affectés > 30 jours
        long nonAffectes = biens.stream()
            .filter(b -> (b.getService() == null || b.getService().isBlank())
                && b.getDateAcquisition() != null
                && b.getDateAcquisition().isBefore(now.minusDays(30)))
            .count();
        if (nonAffectes > 0) {
            alertes.add(java.util.Map.of(
                "id", "NON_AFFECTE",
                "titre", "Biens sans affectation prolongée",
                "message", nonAffectes + " bien(s) acquis il y a plus de 30 jours ne sont toujours pas affectés à un service.",
                "niveau", "MOYEN",
                "count", nonAffectes,
                "action", "Gérer les affectations"
            ));
        }

        // Règle 5 : Biens sinistrés sans réforme
        long sinistresActifs = biens.stream()
            .filter(b -> "SINISTRE".equalsIgnoreCase(String.valueOf(b.getStatutOperationnel())))
            .count();
        if (sinistresActifs > 0) {
            alertes.add(java.util.Map.of(
                "id", "SINISTRES_ACTIFS",
                "titre", "Biens sinistrés actifs",
                "message", sinistresActifs + " bien(s) sont marqués comme sinistrés. Déclaration assurance et procédure de réforme recommandées.",
                "niveau", "CRITIQUE",
                "count", sinistresActifs,
                "action", "Consulter les sinistres"
            ));
        }

        return alertes;
    }
}

