package com.patris.service;

import java.time.LocalDate;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.patris.dto.DashboardStatsDTO;
import com.patris.model.Bien;
import com.patris.repository.AffectationRepository;
import com.patris.repository.BienRepository;
import com.patris.repository.EntretienRepository;
import com.patris.repository.StockRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final BienRepository bienRepository;
    private final AffectationRepository affectationRepository;
    private final EntretienRepository entretienRepository;
    private final StockRepository stockRepository;

    public DashboardStatsDTO getStats() {

        // 1ï¸âƒ£ Valeur totale patrimoine
        double valeurTotale = bienRepository.findAllByArchivedFalse()
                .stream()
                .mapToDouble(Bien::getValeur)
                .sum();

        // 2ï¸âƒ£ Taux occupation
        long totalBiens = bienRepository.findAllByArchivedFalse().size();
        long biensOccupes = affectationRepository.countActiveAffectations();

        double tauxOccupation = totalBiens == 0 ? 0 :
                (double) biensOccupes / totalBiens * 100;

        // 3ï¸âƒ£ Biens par Ã©tat
        Map<String, Long> biensParEtat =
                bienRepository.findAllByArchivedFalse()
                        .stream()
                        .collect(Collectors.groupingBy(
                                Bien::getEtat,
                                Collectors.counting()
                        ));

        // 4ï¸âƒ£ Biens Ã  rÃ©former
        long biensAReformer =
                bienRepository.findByEtatAndArchivedFalse("MAUVAIS").size();

        // 5ï¸âƒ£ Biens sans entretien (6 mois exemple)
        LocalDate limite = LocalDate.now().minusMonths(6);
        long biensSansEntretien =
                bienRepository.findBiensSansEntretienDepuis(limite).size();

        // 6ï¸âƒ£ Stock critique
        long stockCritique =
                stockRepository.findAll()
                        .stream()
                        .filter(s -> s.getQuantite() <= s.getSeuilAlerte())
                        .count();

        // 7ï¸âƒ£ CoÃ»t total entretiens
        double coutTotalEntretiens =
                entretienRepository.findAll()
                        .stream()
                        .mapToDouble(e -> e.getCout() == null ? 0 : e.getCout())
                        .sum();

        return new DashboardStatsDTO(
                valeurTotale,
                tauxOccupation,
                biensParEtat,
                biensAReformer,
                biensSansEntretien,
                stockCritique,
                coutTotalEntretiens
        );
    }
}
