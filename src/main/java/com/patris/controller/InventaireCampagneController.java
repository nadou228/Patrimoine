package com.patris.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.patris.dto.inventaire.InventaireCampagneStatsDTO;
import com.patris.model.InventaireCampagne;
import com.patris.service.InventaireCampagneService;
import com.patris.service.InventaireTerrainService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventaires/campagnes")
@RequiredArgsConstructor
public class InventaireCampagneController {

    private final InventaireCampagneService service;
    private final InventaireTerrainService terrainService;

    @GetMapping
    public List<InventaireCampagne> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public InventaireCampagne findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<InventaireCampagne> create(@RequestBody InventaireCampagne campagne) {
        return ResponseEntity.ok(service.create(campagne));
    }

    @PutMapping("/{id}")
    public InventaireCampagne update(@PathVariable Long id, @RequestBody InventaireCampagne campagne) {
        return service.update(id, campagne);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('VALIDATE_INVENTAIRES_AGENT')")
    @PostMapping("/{id}/valider-zone")
    public ResponseEntity<Void> validerZone(@PathVariable Long id) {
        service.validerZoneConfort(id);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAuthority('VALIDATE_INVENTAIRES_SUPERVISEUR') or hasAuthority('VALIDATE_INVENTAIRES_ECART')")
    @PostMapping("/{id}/certifier")
    public ResponseEntity<InventaireCampagne> certifier(@PathVariable Long id) {
        return ResponseEntity.ok(service.certifier(id));
    }

    @GetMapping("/{id}/stats")
    public InventaireCampagneStatsDTO stats(@PathVariable Long id) {
        return terrainService.stats(id);
    }

    @PreAuthorize("hasAuthority('VALIDATE_INVENTAIRES_ECART') or hasAuthority('VALIDATE_INVENTAIRES_SUPERVISEUR')")
    @PostMapping("/{id}/rapprochement")
    public ResponseEntity<java.util.Map<String, Object>> rapprochement(@PathVariable Long id) {
        int ecarts = terrainService.lancerRapprochement(id);
        return ResponseEntity.ok(java.util.Map.of("ecartsDetectes", ecarts));
    }
}
