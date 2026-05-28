package com.patris.controller;

import com.patris.model.Bien;
import com.patris.repository.BienRepository;
import com.patris.service.export.ExcelExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/export/excel")
@RequiredArgsConstructor
public class ExportController {

    private final ExcelExportService excelExportService;
    private final BienRepository bienRepository;
    private final com.patris.audit.AuditService auditService;

    @GetMapping("/oem")
    @PreAuthorize("hasAuthority('VIEW_DASHBOARD')")
    public ResponseEntity<byte[]> exportOEM(
            @RequestParam(required = false) String institution,
            @RequestParam(required = false) String poste
    ) throws IOException {
        List<Bien> biens = bienRepository.findAll();
        
        Map<String, String> metadata = new HashMap<>();
        metadata.put("institution", institution != null ? institution : "MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES");
        metadata.put("poste", poste != null ? poste : "CENTRAL DE LAME");
        metadata.put("exercice", "2024");

        byte[] excelContent = excelExportService.generateOEM(biens, metadata);

        String filename = "OEM_Patrimoine_2024.xlsx";
        auditService.save("EXPORT", "REPORT", null, "Génération Ordre d'Entrée des Matières (OEM)");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelContent);
    }

    @GetMapping("/lj-a")
    @PreAuthorize("hasAuthority('VIEW_DASHBOARD')")
    public ResponseEntity<byte[]> exportLJA(
            @RequestParam(required = false) String institution,
            @RequestParam(required = false) String poste,
            @RequestParam(required = false) String exercice
    ) throws IOException {
        List<Bien> biens = bienRepository.findAll();
        
        Map<String, String> metadata = new HashMap<>();
        metadata.put("institution", institution != null ? institution : "MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES");
        metadata.put("poste", poste != null ? poste : "CENTRAL DE LAME");
        metadata.put("exercice", exercice != null ? exercice : "2024");

        byte[] excelContent = excelExportService.generateLJA(biens, metadata);

        String filename = "LJA_Patrimoine_" + metadata.get("exercice") + ".xlsx";
        auditService.save("EXPORT", "REPORT", null, "Génération Livre Journal Immobilisations (LJ-A)");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelContent);
    }

    @GetMapping("/fia")
    @PreAuthorize("hasAuthority('VIEW_DASHBOARD')")
    public ResponseEntity<byte[]> exportFIA(
            @RequestParam(required = false) String institution,
            @RequestParam(required = false) String poste,
            @RequestParam(required = false) String exercice
    ) throws IOException {
        List<Bien> biens = bienRepository.findAll();
        Map<String, String> metadata = new HashMap<>();
        metadata.put("institution", institution != null ? institution : "MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES");
        metadata.put("poste", poste != null ? poste : "CENTRAL DE LAME");
        metadata.put("exercice", exercice != null ? exercice : "2024");
        byte[] content = excelExportService.generateFIA(biens, metadata);
        auditService.save("EXPORT", "REPORT", null, "Génération Fiche d'Inventaire Annuel (FIA)");
        return createResponse(content, "FIA_" + metadata.get("exercice") + ".xlsx");
    }

    @GetMapping("/fib")
    @PreAuthorize("hasAuthority('VIEW_DASHBOARD')")
    public ResponseEntity<byte[]> exportFIB(
            @RequestParam(required = false) String institution,
            @RequestParam(required = false) String poste,
            @RequestParam(required = false) String exercice
    ) throws IOException {
        List<Bien> biens = bienRepository.findAll();
        Map<String, String> metadata = new HashMap<>();
        metadata.put("institution", institution != null ? institution : "MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES");
        metadata.put("poste", poste != null ? poste : "CENTRAL DE LAME");
        metadata.put("exercice", exercice != null ? exercice : "2024");
        byte[] content = excelExportService.generateFIB(biens, metadata);
        auditService.save("EXPORT", "REPORT", null, "Génération Fiche Matricule Bâtiments (FIB)");
        return createResponse(content, "FIB_" + metadata.get("exercice") + ".xlsx");
    }

    @GetMapping("/bgc")
    @PreAuthorize("hasAuthority('VIEW_DASHBOARD')")
    public ResponseEntity<byte[]> exportBGC(
            @RequestParam(required = false) String institution,
            @RequestParam(required = false) String poste,
            @RequestParam(required = false) String exercice
    ) throws IOException {
        List<Bien> biens = bienRepository.findAll();
        Map<String, String> metadata = new HashMap<>();
        metadata.put("institution", institution != null ? institution : "MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES");
        metadata.put("poste", poste != null ? poste : "CENTRAL DE LAME");
        metadata.put("exercice", exercice != null ? exercice : "2024");
        byte[] content = excelExportService.generateBGC(biens, metadata);
        auditService.save("EXPORT", "REPORT", null, "Génération Balance Générale des Comptes (BGC)");
        return createResponse(content, "BGC_" + metadata.get("exercice") + ".xlsx");
    }

    @GetMapping("/gl-a")
    @PreAuthorize("hasAuthority('VIEW_DASHBOARD')")
    public ResponseEntity<byte[]> exportGLA(
            @RequestParam(required = false) String institution,
            @RequestParam(required = false) String poste,
            @RequestParam(required = false) String exercice
    ) throws IOException {
        List<Bien> biens = bienRepository.findAll();
        Map<String, String> metadata = new HashMap<>();
        metadata.put("institution", institution != null ? institution : "MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES");
        metadata.put("poste", poste != null ? poste : "CENTRAL DE LAME");
        metadata.put("exercice", exercice != null ? exercice : "2024");
        byte[] content = excelExportService.generateGLA(biens, metadata);
        auditService.save("EXPORT", "REPORT", null, "Génération Grand Livre Immobilisations (GL-A)");
        return createResponse(content, "GLA_" + metadata.get("exercice") + ".xlsx");
    }

    private ResponseEntity<byte[]> createResponse(byte[] content, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(content);
    }
}
