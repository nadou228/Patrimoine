package com.patris.controller;

import com.patris.model.Mobilier;
import com.patris.service.MobilierService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mobilier")
@RequiredArgsConstructor
public class MobilierController {

    private final MobilierService mobilierService;

    @GetMapping
    public List<Mobilier> getAll() {
        return mobilierService.findAll();
    }

    @GetMapping("/{id}")
    public Mobilier findById(@PathVariable Long id) {
        return mobilierService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Mobilier> create(@RequestBody Mobilier mobilier) {
        return ResponseEntity.ok(mobilierService.save(mobilier));
    }

    @PutMapping("/{id}")
    public Mobilier update(@PathVariable Long id, @RequestBody Mobilier mobilier){
        return mobilierService.update(id, mobilier);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Mobilier> delete(@PathVariable Long id) {
        mobilierService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
