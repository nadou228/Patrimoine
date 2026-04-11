package com.patris.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import com.patris.model.Bien;
import com.patris.repository.BienRepository;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AmortissementScheduler {

    private final BienRepository bienRepository;
    private final BienService bienService;

    /**
     * Recalcule les amortissements et la VNC pour tous les actifs non archivÃ©s.
     * ExÃ©cution quotidienne Ã  minuit.
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void recalculerAmortissementsQuotidien() {
        log.info("DÃ©marrage du recalcul automatique des amortissements...");
        List<Bien> actifs = bienRepository.findAllByArchivedFalse();
        
        int count = 0;
        for (Bien bien : actifs) {
            try {
                bienService.calculValeurNette(bien);
                bienRepository.save(bien);
                count++;
            } catch (Exception e) {
                log.error("Erreur lors du recalcul pour le bien IUP {}: {}", bien.getIup(), e.getMessage());
            }
        }
        
        log.info("Recalcul terminÃ© : {} actifs mis Ã  jour.", count);
    }
}
