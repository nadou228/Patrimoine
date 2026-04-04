package com.patris.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;

import com.patris.model.Entretien;
import com.patris.service.EntretienService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/entretiens")
@RequiredArgsConstructor
public class EntretienController {

    private final EntretienService entretienService;

    @GetMapping
    public List<Entretien> findAll() {
        return entretienService.findAll();
    }

    @GetMapping("/{id}")
    public Entretien findById(@PathVariable Long id) {
        return entretienService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Entretien> createEntretien(@RequestBody Entretien entretien) {
        return ResponseEntity.ok(entretienService.save(entretien));
    }

    @PutMapping("/{id}")
    public Entretien update(@PathVariable Long id, @RequestBody Entretien entretien){
        return entretienService.update(id, entretien);
    }

    @PostMapping("/{id}/cloture")
    public Entretien cloturer(@PathVariable Long id){
        return entretienService.cloturer(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Entretien> deleteEntretien(@PathVariable Long id) {
        entretienService.delete(id);
        return ResponseEntity.noContent().build();
    }
} 
