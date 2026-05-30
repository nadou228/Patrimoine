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
import com.patris.model.InventaireEcart;
import com.patris.service.InventaireEcartService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventaires/ecarts")
@RequiredArgsConstructor
public class InventaireEcartController {

    private final InventaireEcartService service;

    @GetMapping
    public List<InventaireEcart> findAll(@RequestParam(required = false) Long campagneId) {
        if (campagneId != null) {
            return service.findByCampagne(campagneId);
        }
        return service.findAll();
    }

    @GetMapping("/{id}")
    public InventaireEcart findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<InventaireEcart> create(@RequestBody InventaireEcart ecart) {
        return ResponseEntity.ok(service.create(ecart));
    }

    @PutMapping("/{id}")
    public InventaireEcart update(@PathVariable Long id, @RequestBody InventaireEcart ecart) {
        return service.update(id, ecart);
    }

    @PreAuthorize("hasAuthority('VALIDATE_INVENTAIRES_ECART')")
    @PostMapping("/{id}/validation")
    public InventaireEcart validation(@PathVariable Long id, @RequestParam statutValidation statut) {
        return service.valider(id, statut);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
