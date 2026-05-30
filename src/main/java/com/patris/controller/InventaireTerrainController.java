package com.patris.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.patris.dto.inventaire.InventaireCampagneStatsDTO;
import com.patris.dto.inventaire.TerrainRecensementRequest;
import com.patris.dto.inventaire.TerrainRecensementResponse;
import com.patris.dto.inventaire.TerrainScanResponse;
import com.patris.service.InventaireTerrainService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventaires/terrain")
@RequiredArgsConstructor
public class InventaireTerrainController {

    private final InventaireTerrainService terrainService;

    @GetMapping("/scan")
    public TerrainScanResponse scan(
            @RequestParam Long campagneId,
            @RequestParam String code) {
        return terrainService.scan(campagneId, code);
    }

    @PreAuthorize("hasAuthority('VALIDATE_INVENTAIRES_AGENT')")
    @PostMapping("/recensement")
    public ResponseEntity<TerrainRecensementResponse> recenser(@RequestBody TerrainRecensementRequest request) {
        return ResponseEntity.ok(terrainService.recenser(request));
    }

    @GetMapping("/campagnes/{campagneId}/stats")
    public InventaireCampagneStatsDTO stats(@PathVariable Long campagneId) {
        return terrainService.stats(campagneId);
    }

    @PreAuthorize("hasAuthority('VALIDATE_INVENTAIRES_ECART') or hasAuthority('VALIDATE_INVENTAIRES_SUPERVISEUR')")
    @PostMapping("/campagnes/{campagneId}/rapprochement")
    public ResponseEntity<java.util.Map<String, Object>> rapprochement(@PathVariable Long campagneId) {
        int ecarts = terrainService.lancerRapprochement(campagneId);
        return ResponseEntity.ok(java.util.Map.of(
                "ecartsDetectes", ecarts,
                "message", ecarts + " écart(s) généré(s) ou mis à jour (biens non recensés)"));
    }
}
