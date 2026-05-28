package com.patris.controller;

import java.time.LocalDate;

import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.patris.audit.AuditLog;
import com.patris.audit.AuditLogRepository;
import com.patris.audit.AuditService;
import java.security.Principal;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository repository;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN', 'AUDITEUR', 'RESPONSABLE_PATRIMOINE')")
    public java.util.List<AuditLog> findAll() {
        return repository.findAll();
    }

    @GetMapping("/logs")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN', 'AUDITEUR', 'RESPONSABLE_PATRIMOINE')")
    public Page<AuditLog> findLogs(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) String action,
        @RequestParam(required = false) String utilisateur,
        @RequestParam(required = false) String entite,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin
    ) {
        return auditService.findLogs(page, size, action, utilisateur, entite, dateDebut, dateFin);
    }

    @GetMapping("/export/excel")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN', 'AUDITEUR', 'RESPONSABLE_PATRIMOINE')")
    public ResponseEntity<byte[]> exportExcel(
        @RequestParam(required = false) String action,
        @RequestParam(required = false) String utilisateur,
        @RequestParam(required = false) String entite,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin
    ) {
        byte[] content = auditService.exportLogsToExcel(action, utilisateur, entite, dateDebut, dateFin);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=journal_audit.xlsx")
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .body(content);
    }

    @DeleteMapping("/{id:\\d+}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
    public void delete(@PathVariable("id") Long id) {
        repository.deleteById(id);
    }

    @PostMapping("/rollback/{id:\\d+}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
    public ResponseEntity<?> rollback(@PathVariable("id") Long id, Principal principal) {
        try {
            String adminUser = principal != null ? principal.getName() : "system";
            auditService.rollbackAction(id, adminUser);
            return ResponseEntity.ok().body("{\"message\": \"Action annulée avec succès\"}");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @DeleteMapping("/hard-delete/{id:\\d+}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
    public ResponseEntity<?> hardDelete(@PathVariable("id") Long id, Principal principal) {
        try {
            String adminUser = principal != null ? principal.getName() : "system";
            auditService.hardDelete(id, adminUser);
            return ResponseEntity.ok().body("{\"message\": \"Entité supprimée définitivement avec succès\"}");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }
}
