package com.patris.controller;

import com.patris.model.CampagneInventaire;
import com.patris.model.FicheRecensement;
import com.patris.model.EcartInventaire;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/inventaire")
@CrossOrigin("*")
public class InventaireController {

    // Endpoints for Campagnes
    @GetMapping("/campagnes")
    public ResponseEntity<List<CampagneInventaire>> getCampagnes() {
        // TODO: call service/repository
        return ResponseEntity.ok(new ArrayList<>());
    }

    @PostMapping("/campagnes")
    public ResponseEntity<CampagneInventaire> createCampagne(@RequestBody CampagneInventaire campagne) {
        // TODO: call service/repository
        return ResponseEntity.ok(campagne);
    }

    // Endpoints for Fiches de Recensement (Field scans)
    @PostMapping("/scans")
    public ResponseEntity<FicheRecensement> postScan(@RequestBody FicheRecensement fiche) {
        // TODO: compare scanned IUP with theoretic DB, create Ecart if necessary
        return ResponseEntity.ok(fiche);
    }

    // Endpoints for Ecarts
    @GetMapping("/ecarts")
    public ResponseEntity<List<EcartInventaire>> getEcarts() {
        // TODO: fetch logic
        return ResponseEntity.ok(new ArrayList<>());
    }
}
