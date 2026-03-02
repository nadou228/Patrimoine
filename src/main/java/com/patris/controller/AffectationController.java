package com.patris.controller;

import com.patris.model.Affectation;
import com.patris.service.AffectationService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/affectations")
@RequiredArgsConstructor
public class AffectationController {

    private final AffectationService service;

    @GetMapping
    public List<Affectation> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Affectation findById(@PathVariable Long id){
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<Affectation> create(@RequestBody Affectation affectation) {
        return ResponseEntity.ok(service.save(affectation));
    }

    @PutMapping("/{id}")
    public Affectation update(@PathVariable Long id, @RequestBody Affectation affectation){
        return service.update(id, affectation);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Affectation> delete(@PathVariable Long id){
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}