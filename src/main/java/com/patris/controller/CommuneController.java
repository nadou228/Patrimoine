package com.patris.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.patris.model.Commune;
import com.patris.service.CommuneService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/communes")
@RequiredArgsConstructor
public class CommuneController {

    private final CommuneService service;

    @GetMapping
    public List<Commune> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Commune findById(@PathVariable Long id){
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<Commune> createCommune(@RequestBody Commune commune) {
        return ResponseEntity.ok(service.save(commune));
    }

    @PutMapping("/{id}")
    public Commune update(@PathVariable Long id, @RequestBody Commune commune){
        return service.updateCommune(id, commune);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Commune> delete(@PathVariable Long id) {
        service.deleteCommune(id);
        return ResponseEntity.noContent().build();
    }
} 
