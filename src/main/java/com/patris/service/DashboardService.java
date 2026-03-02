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

        // 1️⃣ Valeur totale patrimoine
        double valeurTotale = bienRepository.findAll()
                .stream()
                .mapToDouble(Bien::getValeur)
                .sum();

        // 2️⃣ Taux occupation
        long totalBiens = bienRepository.count();
        long biensOccupes = affectationRepository.countActiveAffectations();

        double tauxOccupation = totalBiens == 0 ? 0 :
                (double) biensOccupes / totalBiens * 100;

        // 3️⃣ Biens par état
        Map<String, Long> biensParEtat =
                bienRepository.findAll()
                        .stream()
                        .collect(Collectors.groupingBy(
                                Bien::getEtat,
                                Collectors.counting()
                        ));

        // 4️⃣ Biens à réformer
        long biensAReformer =
                bienRepository.findByEtat("MAUVAIS").size();

        // 5️⃣ Biens sans entretien (6 mois exemple)
        LocalDate limite = LocalDate.now().minusMonths(6);
        long biensSansEntretien =
                bienRepository.findBiensSansEntretienDepuis(limite).size();

        // 6️⃣ Stock critique
        long stockCritique =
                stockRepository.findAll()
                        .stream()
                        .filter(s -> s.getQuantite() <= s.getSeuilAlerte())
                        .count();

        // 7️⃣ Coût total entretiens
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