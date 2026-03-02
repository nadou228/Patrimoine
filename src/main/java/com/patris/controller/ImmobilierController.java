package com.patris.controller;

import com.patris.model.Immobilier;
import com.patris.service.ImmobilierService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/immobilier")
@RequiredArgsConstructor
public class ImmobilierController {

    private final ImmobilierService immobilierService;

    @GetMapping
    public List<Immobilier> findAll() {
        return immobilierService.findAll();
    }

    @GetMapping("/{id}")
    public Immobilier findById(@PathVariable Long id) {
        return immobilierService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Immobilier> create(@RequestBody Immobilier immobilier) {
        return ResponseEntity.ok(immobilierService.save(immobilier)) ;
    }
    
    @PutMapping("/{id}")
    public Immobilier update(@PathVariable Long id, @RequestBody Immobilier immobilier){
        return immobilierService.update(id, immobilier);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Immobilier> delete(@PathVariable Long id) {
        immobilierService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
