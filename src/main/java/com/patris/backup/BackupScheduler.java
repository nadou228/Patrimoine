package com.patris.backup;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.backup.enabled", havingValue = "true", matchIfMissing = true)
public class BackupScheduler {

    private final BackupService backupService;

    // Tous les jours à 02h00
    @Scheduled(cron = "0 0 2 * * *")
    public void scheduleDailyBackup() {
        log.info("Lancement de la sauvegarde quotidienne programmée.");
        try {
            backupService.createBackup("daily");
        } catch (Exception e) {
            log.error("Erreur lors de la sauvegarde quotidienne.", e);
        }
    }

    // Tous les dimanches à 03h00
    @Scheduled(cron = "0 0 3 * * SUN")
    public void scheduleWeeklyBackup() {
        log.info("Lancement de la sauvegarde hebdomadaire programmée.");
        try {
            backupService.createBackup("weekly");
        } catch (Exception e) {
            log.error("Erreur lors de la sauvegarde hebdomadaire.", e);
        }
    }
}
