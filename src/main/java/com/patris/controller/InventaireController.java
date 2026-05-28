package com.patris.controller;

import com.patris.model.Inventaire;
import com.patris.service.InventaireService;
import lombok.RequiredArgsConstructor;
import com.patris.model.CampagneInventaire;
import com.patris.model.FicheRecensement;
import com.patris.model.EcartInventaire;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.ArrayList;

@RestController
@CrossOrigin("*")
@RequiredArgsConstructor
public class InventaireController {
    
    private final InventaireService service;

    @GetMapping("/api/inventaires")
    public ResponseEntity<List<Inventaire>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @PostMapping("/api/inventaires")
    public ResponseEntity<Inventaire> create(@RequestBody Inventaire entity) {
        return ResponseEntity.ok(service.save(entity));
    }

    // Endpoints for Campagnes
    @GetMapping("/api/inventaire/campagnes")
    public ResponseEntity<List<CampagneInventaire>> getCampagnes() {
        // TODO: call service/repository
        return ResponseEntity.ok(new ArrayList<>());
    }

    @PostMapping("/api/inventaire/campagnes")
    public ResponseEntity<CampagneInventaire> createCampagne(@RequestBody CampagneInventaire campagne) {
        // TODO: call service/repository
        return ResponseEntity.ok(campagne);
    }

    // Endpoints for Fiches de Recensement (Field scans)
    @PostMapping("/api/inventaire/scans")
    public ResponseEntity<FicheRecensement> postScan(@RequestBody FicheRecensement fiche) {
        // TODO: compare scanned IUP with theoretic DB, create Ecart if necessary
        return ResponseEntity.ok(fiche);
    }

    // Endpoints for Ecarts
    @GetMapping("/api/inventaire/ecarts")
    public ResponseEntity<List<EcartInventaire>> getEcarts() {
        // TODO: fetch logic
        return ResponseEntity.ok(new ArrayList<>());
    }
}
