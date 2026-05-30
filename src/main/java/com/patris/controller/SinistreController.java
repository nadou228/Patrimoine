package com.patris.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.patris.model.Sinistre;
import com.patris.service.SinistreService;

import lombok.RequiredArgsConstructor;


@RestController
@RequestMapping("/api/sinistres")
@RequiredArgsConstructor
public class SinistreController {

    private final SinistreService sinistreService;
    private final com.patris.service.FileStorageService fileStorageService;

    @GetMapping
    public List<Sinistre> findAll(){
        return sinistreService.findAll();
    }

    @GetMapping("/{id}")
    public Sinistre findById(@PathVariable Long id){
        return sinistreService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Sinistre> create(@RequestBody Sinistre sinistre){
        return ResponseEntity.ok(sinistreService.save(sinistre));
    }

    @PutMapping("/{id}")
    public Sinistre update(@PathVariable Long id, @RequestBody Sinistre sinistre){
        return sinistreService.update(id, sinistre);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Sinistre> delete(@PathVariable Long id){
        sinistreService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/rapport")
    public ResponseEntity<Sinistre> uploadRapport(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        String url = fileStorageService.store("sinistres", file);
        Sinistre s = sinistreService.findById(id);
        String current = s.getPiecesJointes() == null ? "" : s.getPiecesJointes();
        if (!current.isEmpty()) current += "," + url; else current = url;
        s.setPiecesJointes(current);
        return ResponseEntity.ok(sinistreService.update(id, s));
    }

    @PreAuthorize("hasAuthority('VALIDATE_SINISTRES')")
    @PutMapping("/{id}/valider")
    public ResponseEntity<Sinistre> valider(@PathVariable Long id, @RequestBody(required = false) java.util.Map<String, String> payload) {
        String acteur = payload != null ? payload.getOrDefault("validateur", "systeme") : "systeme";
        String statut = payload != null ? payload.getOrDefault("statut", "CLASSE") : "CLASSE";
        return ResponseEntity.ok(sinistreService.valider(id, statut, acteur));
    }

}
