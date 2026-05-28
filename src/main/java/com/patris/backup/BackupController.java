package com.patris.backup;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/backups")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
public class BackupController {

    private final BackupService backupService;

    @GetMapping
    public ResponseEntity<List<BackupService.BackupFileInfo>> listBackups() {
        return ResponseEntity.ok(backupService.listBackups());
    }

    @PostMapping("/now")
    public ResponseEntity<?> triggerManualBackup(@RequestParam(defaultValue = "manual") String type) {
        try {
            String fileName = backupService.createBackup(type);
            return ResponseEntity.ok().body("{\"message\": \"Sauvegarde créée avec succès : " + fileName + "\"}");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }
}
