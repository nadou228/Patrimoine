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

import com.patris.model.InventaireCampagne;
import com.patris.service.InventaireCampagneService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventaires/campagnes")
@RequiredArgsConstructor
public class InventaireCampagneController {

    private final InventaireCampagneService service;

    @GetMapping
    public List<InventaireCampagne> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public InventaireCampagne findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<InventaireCampagne> create(@RequestBody InventaireCampagne campagne) {
        return ResponseEntity.ok(service.create(campagne));
    }

    @PutMapping("/{id}")
    public InventaireCampagne update(@PathVariable Long id, @RequestBody InventaireCampagne campagne) {
        return service.update(id, campagne);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
