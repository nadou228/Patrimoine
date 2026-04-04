package com.patris.controller;

import com.patris.model.Inventaire;
import com.patris.service.InventaireService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventaires")
@RequiredArgsConstructor
public class InventaireController {
    
    private final InventaireService service;

    @GetMapping
    public ResponseEntity<List<Inventaire>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @PostMapping
    public ResponseEntity<Inventaire> create(@RequestBody Inventaire entity) {
        return ResponseEntity.ok(service.save(entity));
    }
}
