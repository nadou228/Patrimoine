package com.patris.controller;

import com.patris.model.Beneficiaire;
import com.patris.service.BeneficiaireService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/beneficiaires")
@RequiredArgsConstructor
public class BeneficiaireController {

    private final BeneficiaireService service;

    @GetMapping
    public List<Beneficiaire> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Beneficiaire findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public Beneficiaire save(@RequestBody Beneficiaire beneficiaire) {
        return service.save(beneficiaire);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public List<Beneficiaire> search(@RequestParam String q) {
        return service.search(q);
    }
}
