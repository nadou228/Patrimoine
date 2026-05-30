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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.patris.enums.statutValidation;
import com.patris.model.InventaireFiche;
import com.patris.service.InventaireFicheService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventaires/fiches")
@RequiredArgsConstructor
public class InventaireFicheController {

    private final InventaireFicheService service;

    @GetMapping
    public List<InventaireFiche> findAll(@RequestParam(required = false) Long campagneId) {
        if (campagneId != null) {
            return service.findByCampagne(campagneId);
        }
        return service.findAll();
    }

    @GetMapping("/{id}")
    public InventaireFiche findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<InventaireFiche> create(@RequestBody InventaireFiche fiche) {
        return ResponseEntity.ok(service.create(fiche));
    }

    @PutMapping("/{id}")
    public InventaireFiche update(@PathVariable Long id, @RequestBody InventaireFiche fiche) {
        return service.update(id, fiche);
    }

    @PreAuthorize("hasAuthority('VALIDATE_INVENTAIRES_AGENT')")
    @PostMapping("/{id}/validation-agent")
    public InventaireFiche validationAgent(@PathVariable Long id, @RequestParam statutValidation statut) {
        return service.validerAgent(id, statut);
    }

    @PreAuthorize("hasAuthority('VALIDATE_INVENTAIRES_SUPERVISEUR')")
    @PostMapping("/{id}/validation-superviseur")
    public InventaireFiche validationSuperviseur(@PathVariable Long id, @RequestParam statutValidation statut) {
        return service.validerSuperviseur(id, statut);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
