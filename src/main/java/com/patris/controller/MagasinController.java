package com.patris.controller;

import com.patris.model.Magasin;
import com.patris.repository.MagasinRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/magasins")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MagasinController {

    private final MagasinRepository magasinRepository;

    @GetMapping
    public List<Magasin> findAll() {
        return magasinRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Magasin> findById(@PathVariable Long id) {
        return magasinRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Magasin create(@RequestBody Magasin magasin) {
        return magasinRepository.save(magasin);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Magasin> update(@PathVariable Long id, @RequestBody Magasin details) {
        return magasinRepository.findById(id)
                .map(m -> {
                    m.setNom(details.getNom());
                    m.setCode(details.getCode());
                    m.setLocalisation(details.getLocalisation());
                    m.setResponsable(details.getResponsable());
                    return ResponseEntity.ok(magasinRepository.save(m));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return magasinRepository.findById(id)
                .map(m -> {
                    magasinRepository.delete(m);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
