package com.patris.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;

import com.patris.audit.AuditLogRepository;
import com.patris.dto.DashboardStatsDTO;
import com.patris.model.Bien;
import com.patris.model.BienMaterielRoulant;
import com.patris.model.BienMobilier;
import com.patris.model.Stock;
import com.patris.repository.BienRepository;
import com.patris.repository.MouvementStockRepository;
import com.patris.repository.ReformeRepository;
import com.patris.repository.SinistreRepository;
import com.patris.repository.StockRepository;

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

        List<DashboardStatsDTO.DashboardAlerteStockDTO> alertesStock = stocks.stream()
            .filter(this::isStockInAlert)
            .sorted(Comparator.comparingInt(stock -> stock.getQuantite() - resolveStockThreshold(stock)))
            .limit(5)
            .map(stock -> new DashboardStatsDTO.DashboardAlerteStockDTO(
                stock.getId(),
                stock.getConsommable() != null ? stock.getConsommable().getCodeArticle() : "",
                stock.getConsommable() != null ? stock.getConsommable().getNomProduit() : "Article",
                stock.getQuantite(),
                resolveStockThreshold(stock),
                stock.getUnite(),
                stock.getMagasin() != null ? stock.getMagasin().getNom() : ""
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
            activiteRecente
        );
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
}
