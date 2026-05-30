package com.patris.controller;

import com.patris.dto.AffectationDto;
import com.patris.model.Affectation;
import com.patris.service.AffectationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import java.util.List;

@RestController
@RequestMapping("/api/affectations")
@CrossOrigin("*")
public class AffectationController {

    private final AffectationService service;

    public AffectationController(AffectationService service) {
        this.service = service;
    }

    @GetMapping
    public List<Affectation> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Affectation> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(service.findById(id));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody AffectationDto dto) {
        try {
            return ResponseEntity.ok(service.saveFromDto(dto));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur lors de la création: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody AffectationDto dto) {
        try {
            return ResponseEntity.ok(service.updateFromDto(id, dto));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur lors de la mise à jour: " + e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('VALIDATE_AFFECTATIONS')")
    @PostMapping("/{id}/valider")
    public ResponseEntity<?> valider(@PathVariable Long id, @RequestParam String validator) {
        try {
            return ResponseEntity.ok(service.validerAffectation(id, validator));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur lors de la validation: " + e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('VALIDATE_AFFECTATIONS')")
    @PostMapping(path = "/{id}/validerAvecDocument", consumes = {"multipart/form-data"})
    public ResponseEntity<?> validerAvecDocument(@PathVariable Long id,
                                                 @RequestParam String validator,
                                                 @RequestPart(required = false) MultipartFile file) {
        try {
            if (file != null && !file.isEmpty()) {
                // Save file to uploads/documents/affectations/{id}/
                Path destDir = Paths.get("uploads", "documents", "affectations", String.valueOf(id));
                Files.createDirectories(destDir);
                String filename = System.currentTimeMillis() + "-" + file.getOriginalFilename();
                Path dest = destDir.resolve(filename);
                file.transferTo(dest.toFile());
                // Build URL path (relative)
                String url = "/uploads/documents/affectations/" + id + "/" + filename;
                // attach to affectation documents
                service.addDocumentUrl(id, url);
            }
            // perform validation
            com.patris.model.Affectation validated = service.validerAffectation(id, validator);
            return ResponseEntity.ok(validated);
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Erreur lors de l'enregistrement du fichier: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur lors de la validation: " + e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('VALIDATE_AFFECTATIONS')")
    @PostMapping("/{id}/rejeter")
    public ResponseEntity<Affectation> rejeter(@PathVariable Long id, @RequestParam String validator) {
        return ResponseEntity.ok(service.rejeterAffectation(id, validator));
    }

    @PutMapping("/{id}/retour")
    public ResponseEntity<Affectation> retour(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload) {
        return ResponseEntity.ok(service.retournerAffectation(
            id,
            payload.get("motif"),
            payload.get("dateRetour"),
            payload.getOrDefault("acteur", "systeme")
        ));
    }
    
    @GetMapping("/origine/{bienId}")
    public String getOrigine(@PathVariable Long bienId) {
        return service.findPreviousHolder(bienId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id){
        service.delete(id);
        return ResponseEntity.ok().build();
    }
}
