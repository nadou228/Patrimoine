package com.patris.controller;

import com.patris.dto.AffectationDto;
import com.patris.model.Affectation;
import com.patris.service.AffectationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<Affectation> create(@RequestBody AffectationDto dto) {
        return ResponseEntity.ok(service.saveFromDto(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Affectation> update(@PathVariable Long id, @RequestBody AffectationDto dto) {
        return ResponseEntity.ok(service.updateFromDto(id, dto));
    }

    @PostMapping("/{id}/valider")
    public ResponseEntity<Affectation> valider(@PathVariable Long id, @RequestParam String validator) {
        return ResponseEntity.ok(service.validerAffectation(id, validator));
    }

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
