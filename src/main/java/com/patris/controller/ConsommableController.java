package com.patris.controller;

import com.patris.model.Consommable;
import com.patris.service.ConsommableService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/consommables")
@RequiredArgsConstructor
public class ConsommableController {

    private final ConsommableService consommableService;

    @GetMapping
    public List<Consommable> findAll() {
        return consommableService.findAll();
    }

    @GetMapping("/{id}")
    public Consommable findById(@PathVariable Long id) {
        return consommableService.findById(id);
    }

    @PostMapping
    public Consommable createConsommable(@RequestBody Consommable consommable) {
        return consommableService.createConsommable(consommable);
    }

    @PutMapping("/{id}")
    public Consommable updateConsommable(@PathVariable Long id, @RequestBody Consommable consommable) {
        return consommableService.updateConsommable(id, consommable);
    }

    @DeleteMapping("/{id}")
    public void deleteConsommable(@PathVariable Long id) {
        consommableService.deleteConsommable(id);
    }
}
