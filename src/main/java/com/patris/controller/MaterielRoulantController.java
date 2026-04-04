package com.patris.controller;

import com.patris.model.MaterielRoulant;
import com.patris.service.MaterielRoulantService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/materiel-roulant")
@RequiredArgsConstructor
public class MaterielRoulantController {

    private final MaterielRoulantService service;

    @GetMapping
    public List<MaterielRoulant> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public MaterielRoulant findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<MaterielRoulant> create(@RequestBody MaterielRoulant materiel) {
        return ResponseEntity.ok(service.save(materiel)) ;
    }

    @PutMapping("/{id}")
    public MaterielRoulant update(@PathVariable Long id, @RequestBody MaterielRoulant materiel){
        return service.update(id, materiel);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MaterielRoulant> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
