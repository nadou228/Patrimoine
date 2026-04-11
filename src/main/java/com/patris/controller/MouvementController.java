package com.patris.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.patris.model.Mouvement;
import com.patris.service.MouvementService;
import com.patris.enums.statutValidation;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/mouvements")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class MouvementController {

    private final MouvementService mouvementService;

    @GetMapping
    public List<Mouvement> findAll() {
        return mouvementService.findAll();
    }

    @GetMapping("/{id}")
    public Mouvement findById(@PathVariable Long id) {
        return mouvementService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Mouvement> createMouvement(@RequestBody Mouvement mouvement) {
        return ResponseEntity.ok(mouvementService.save(mouvement));
    }

    @PutMapping("/{id}")
    public Mouvement update(@PathVariable Long id, @RequestBody Mouvement mouvement){
        return mouvementService.update(id, mouvement);
    }

    @PostMapping("/{id}/validation")
    public Mouvement validate(@PathVariable Long id, @RequestParam statutValidation statut){
        return mouvementService.valider(id, statut);
    }

    @GetMapping("/bien/{bienId}")
    public List<Mouvement> findByBien(@PathVariable Long bienId) {
        return mouvementService.findByBienId(bienId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Mouvement> delete(@PathVariable Long id){
        mouvementService.delete(id);
        return ResponseEntity.noContent().build();
    }

    
} 
